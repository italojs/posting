import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Parser from 'rss-parser';
import { Content, FetchRssInput, FetchRssResult, RssItem, GenerateSuggestionInput, GenerateSuggestionResult } from '../models';
import ContentsCollection from '../contents';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';

const parser = new Parser();

Meteor.methods({
    'get.contents.byId': async ({ _id }: { _id: string }) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        if (typeof _id !== 'string' || !_id) return clientContentError('ID inválido');
        const doc = (await ContentsCollection.findOneAsync({ _id, userId: user._id })) as Content | undefined;
        if (!doc) return clientContentError('Content not found');
        return doc;
    },
    'get.contents.fetchRss': async ({ urls }: FetchRssInput) => {
        check(urls, [String]);

    const allItems: RssItem[] = [];

        for (const url of urls) {
            try {
                const feed = await parser.parseURL(url);
                const items = (feed.items || []).map((it: any) => ({
                    title: it.title,
                    link: it.link,
                    isoDate: (it as any).isoDate,
                    pubDate: it.pubDate,
                    contentSnippet: it.contentSnippet,
                })) as RssItem[];
                allItems.push(...items);
            } catch (e) {
                // ignore single feed failure; continue others
            }
        }

    const res: FetchRssResult = {
            items: allItems,
        };

        return res;
    },
    'get.contents.generateSuggestion': async ({ contentTemplate, numberOfSections, language }: GenerateSuggestionInput) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const { name, audience, goal } = contentTemplate;
        
        const openaiApiKey = Meteor.settings.private?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        
        if (!openaiApiKey) {
            throw new Meteor.Error('api-key-missing', 'OpenAI API key not configured');
        }

        const prompt = `Based on the following content:
- Name: ${name}
- Target audience: ${audience || 'not specified'}
- Goal: ${goal || 'not specified'}

Generate ${numberOfSections} sections for a newsletter, each with:
1. A creative and attractive title
2. A brief description (maximum 30 words)

Generate all answers in ${language} language. All titles and descriptions must be in ${language}.

Respond only in JSON format with this structure:
{
  "title": "suggested newsletter title",
  "sections": [
    {"title": "section title", "description": "brief description"}
  ]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content;
        const parsedResponse = JSON.parse(aiResponse);
        
        const result: GenerateSuggestionResult = {
            title: parsedResponse.title || `${name} - Edição Especial`,
            sections: parsedResponse.sections || []
        };

        return result;
    },
});
