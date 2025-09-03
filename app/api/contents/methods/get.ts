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
        if (!doc) return clientContentError('Conteúdo não encontrado');
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
    'get.contents.generateSuggestion': async ({ contentTemplate, numberOfSections }: GenerateSuggestionInput) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const { name, audience, goal } = contentTemplate;
        
        const openaiApiKey = Meteor.settings.private?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        
        if (!openaiApiKey) {
            throw new Meteor.Error('api-key-missing', 'OpenAI API key não configurada');
        }

        const prompt = `Baseado no seguinte conteúdo:
- Nome: ${name}
- Público-alvo: ${audience || 'não especificado'}
- Objetivo: ${goal || 'não especificado'}

Gere ${numberOfSections} seções para uma newsletter, cada uma com:
1. Um título criativo e atrativo
2. Uma breve descrição (máximo 30 palavras)

Responda apenas em formato JSON com esta estrutura:
{
  "title": "título sugerido para a newsletter",
  "sections": [
    {"title": "título da seção", "description": "descrição breve"}
  ]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
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
