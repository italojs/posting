import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import * as cheerio from 'cheerio';
import ContentsCollection from '../contents';
import {
    Content,
    CreateContentInput,
    NewsletterSection,
    ProcessedArticle,
    ProcessNewsletterInput,
    RssItem,
    SelectedNewsArticle,
} from '../models';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';

Meteor.methods({
    'set.contents.create': async ({ name, audience, goal, rssUrls, rssItems, networks, newsletterSections }: CreateContentInput) => {
        check(name, String);
        check(audience, Match.Maybe(String));
        check(goal, Match.Maybe(String));
        check(rssUrls, [String]);
        check(rssItems, [Object]);
        check(networks, Object);
    check((networks as any).newsletter, Match.Maybe(Boolean));
    check((networks as any).instagram, Match.Maybe(Boolean));
    check((networks as any).twitter, Match.Maybe(Boolean));
    check((networks as any).tiktok, Match.Maybe(Boolean));
    check((networks as any).linkedin, Match.Maybe(Boolean));

        // Newsletter sections are optional; if present, do a light validation
        check(newsletterSections, Match.Maybe([Object]));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

    const cleanedName = name.trim();
    const cleanedAudience = (audience ?? '').trim();
    const cleanedGoal = (goal ?? '').trim();
        if (!cleanedName) return clientContentError('Nome do conteúdo é obrigatório');
        const cleanedUrls = rssUrls.map((u) => u.trim()).filter(Boolean);
        if (cleanedUrls.length === 0) return clientContentError('Informe pelo menos um RSS');

    const doc: Omit<Content, '_id'> = {
            userId: user._id,
            name: cleanedName,
            audience: cleanedAudience || undefined,
            goal: cleanedGoal || undefined,
            rssUrls: cleanedUrls,
            rssItems: rssItems ?? [],
            networks: {
                newsletter: !!networks.newsletter,
                instagram: !!(networks as any).instagram,
                twitter: !!(networks as any).twitter,
                tiktok: !!(networks as any).tiktok,
                linkedin: !!(networks as any).linkedin,
            },
            newsletterSections: newsletterSections && newsletterSections.length > 0 ? newsletterSections : undefined,
            createdAt: new Date(),
        };

        const _id = await ContentsCollection.insertAsync(doc as any);
        return { _id };
    },
    'set.contents.updateBasic': async ({ _id, name, audience, goal }: { _id: string; name: string; audience?: string; goal?: string }) => {
        check(_id, String);
        check(name, String);
        check(audience, Match.Maybe(String));
        check(goal, Match.Maybe(String));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const cleanedName = name.trim();
        const cleanedAudience = (audience ?? '').trim();
        const cleanedGoal = (goal ?? '').trim();
        if (!cleanedName) return clientContentError('Nome do conteúdo é obrigatório');

        const existing = await ContentsCollection.findOneAsync({ _id, userId: user._id });
        if (!existing) return clientContentError('Conteúdo não encontrado');

        await ContentsCollection.updateAsync(
            { _id, userId: user._id },
            {
                $set: {
                    name: cleanedName,
                    audience: cleanedAudience || undefined,
                    goal: cleanedGoal || undefined,
                },
            },
        );
        return { _id };
    },
    'set.contents.delete': async ({ _id }: { _id: string }) => {
        check(_id, String);
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        const existing = await ContentsCollection.findOneAsync({ _id, userId: user._id });
        if (!existing) return clientContentError('Conteúdo não encontrado');
        await ContentsCollection.removeAsync({ _id, userId: user._id });
        return { _id };
    },
    'set.contents.update': async ({ _id, name, audience, goal, rssUrls, rssItems, networks, newsletterSections }: CreateContentInput & { _id: string }) => {
        check(_id, String);
        check(name, String);
        check(audience, Match.Maybe(String));
        check(goal, Match.Maybe(String));
        check(rssUrls, [String]);
        check(rssItems, [Object]);
        check(networks, Object);
        check((networks as any).newsletter, Match.Maybe(Boolean));
        check((networks as any).instagram, Match.Maybe(Boolean));
        check((networks as any).twitter, Match.Maybe(Boolean));
        check((networks as any).tiktok, Match.Maybe(Boolean));
        check((networks as any).linkedin, Match.Maybe(Boolean));
        check(newsletterSections, Match.Maybe([Object]));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const existing = await ContentsCollection.findOneAsync({ _id, userId: user._id });
        if (!existing) return clientContentError('Conteúdo não encontrado');

        const cleanedName = name.trim();
        const cleanedAudience = (audience ?? '').trim();
        const cleanedGoal = (goal ?? '').trim();
        if (!cleanedName) return clientContentError('Nome do conteúdo é obrigatório');
        const cleanedUrls = rssUrls.map((u) => u.trim()).filter(Boolean);
        if (cleanedUrls.length === 0) return clientContentError('Informe pelo menos um RSS');

        await ContentsCollection.updateAsync(
            { _id, userId: user._id },
            {
                $set: {
                    name: cleanedName,
                    audience: cleanedAudience || undefined,
                    goal: cleanedGoal || undefined,
                    rssUrls: cleanedUrls,
                    rssItems: rssItems ?? [],
                    networks: {
                        newsletter: !!networks.newsletter,
                        instagram: !!(networks as any).instagram,
                        twitter: !!(networks as any).twitter,
                        tiktok: !!(networks as any).tiktok,
                        linkedin: !!(networks as any).linkedin,
                    },
                    newsletterSections: newsletterSections && newsletterSections.length > 0 ? newsletterSections : undefined,
                },
            },
        );
        return { _id };
    },
    'set.contents.processNewsletter': async ({ name, audience, goal, rssUrls, rssItems, networks, newsletterSections, language }: ProcessNewsletterInput) => {
        check(name, String);
        check(audience, Match.Maybe(String));
        check(goal, Match.Maybe(String));
        check(rssUrls, [String]);
        check(rssItems, [Object]);
        check(networks, Object);
        check((networks as any).newsletter, Match.Maybe(Boolean));
        check((networks as any).instagram, Match.Maybe(Boolean));
        check((networks as any).twitter, Match.Maybe(Boolean));
        check((networks as any).tiktok, Match.Maybe(Boolean));
        check((networks as any).linkedin, Match.Maybe(Boolean));
        check(newsletterSections, Match.Maybe([Object]));
        check(language, Match.Maybe(String));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        if (!newsletterSections || newsletterSections.length === 0) {
            return { success: false, error: 'No sections available for processing', processedLinks: 0 };
        }

        const normalizedLanguage = typeof language === 'string' ? language.trim() : undefined;
        const resolvedLanguage = resolveLanguageInfo(normalizedLanguage);
        const newsletterContext: NewsletterContext = {
            title: name,
            goal,
            audience,
            languageName: resolvedLanguage.name,
            languageTag: resolvedLanguage.tag,
            labels: resolvedLanguage.labels,
        };

        const sectionResults = await Promise.all(
            newsletterSections.map(async (section: NewsletterSection, index) => {
                const processedArticles = await processSectionItems(section.rssItems, section.newsArticles);
                if (processedArticles.length === 0) {
                    return null;
                }

                return {
                    title: section.title || `Section ${index + 1}`,
                    description: section.description,
                    content: processedArticles,
                };
            }),
        );

        const sessions = sectionResults.filter((section): section is NonNullable<typeof section> => section !== null);

        if (sessions.length === 0) {
            return { success: false, error: 'No content was successfully extracted', processedLinks: 0 };
        }

        const generatedSections = [] as GeneratedNewsletterSection[];

        for (const session of sessions) {
            const articleSummaries = [] as ArticleSummary[];

            for (const article of session.content) {
                try {
                    const summary = await summarizeArticleWithOpenAI(article, newsletterContext);
                    articleSummaries.push({
                        title: article.title,
                        url: article.url,
                        summary,
                    });
                } catch (error) {
                    console.error('Failed to summarize article', article.url, error);
                }
            }

            if (articleSummaries.length === 0) {
                continue;
            }

            try {
                const generatedContent = await generateSectionWithOpenAI({
                    newsletter: newsletterContext,
                    section: {
                        title: session.title,
                        description: session.description,
                    },
                    articleSummaries,
                });

                generatedSections.push({
                    originalTitle: session.title,
                    originalDescription: session.description,
                    articleSummaries,
                    generatedTitle: generatedContent.title,
                    summary: generatedContent.summary,
                    body: generatedContent.body,
                    callToAction: generatedContent.callToAction,
                });
            } catch (error) {
                console.error('Failed to generate newsletter section content', session.title, error);
            }
        }

        if (generatedSections.length === 0) {
            return { success: false, error: 'Unable to generate newsletter sections', processedLinks: 0 };
        }

        const compiledMarkdown = buildNewsletterMarkdown(
            newsletterContext,
            generatedSections,
        );

        const finalNewsletter = {
            title: name,
            goal,
            audience,
            sections: generatedSections,
            compiledMarkdown,
        };

        return finalNewsletter;
    },
});

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ARTICLE_TEXT_SUMMARY_LIMIT = 8000;
const OPENAI_MODEL = 'gpt-4o-mini';

type ArticleSummary = {
    title: string;
    url: string;
    summary: string;
};

type GeneratedSectionContent = {
    title: string;
    summary: string;
    body: string;
    callToAction?: string;
};

type GeneratedNewsletterSection = {
    originalTitle: string;
    originalDescription?: string;
    articleSummaries: ArticleSummary[];
    generatedTitle: string;
    summary: string;
    body: string;
    callToAction?: string;
};

type NewsletterContext = {
    title: string;
    goal?: string;
    audience?: string;
    languageName: string;
    languageTag: string;
    labels: {
        goal: string;
        audience: string;
        callToAction: string;
    };
};

type LanguageInfo = {
    name: string;
    tag: string;
    labels: {
        goal: string;
        audience: string;
        callToAction: string;
    };
};

const LANGUAGE_INFO_MAP: Record<string, LanguageInfo> = {
    'pt': { name: 'Portuguese', tag: 'pt-BR', labels: { goal: 'Objetivo', audience: 'Audiência', callToAction: 'Chamada para ação' } },
    'pt-br': { name: 'Portuguese', tag: 'pt-BR', labels: { goal: 'Objetivo', audience: 'Audiência', callToAction: 'Chamada para ação' } },
    'pt_br': { name: 'Portuguese', tag: 'pt-BR', labels: { goal: 'Objetivo', audience: 'Audiência', callToAction: 'Chamada para ação' } },
    'es': { name: 'Spanish', tag: 'es', labels: { goal: 'Objetivo', audience: 'Audiencia', callToAction: 'Llamado a la acción' } },
    'es-es': { name: 'Spanish', tag: 'es-ES', labels: { goal: 'Objetivo', audience: 'Audiencia', callToAction: 'Llamado a la acción' } },
    'es_es': { name: 'Spanish', tag: 'es-ES', labels: { goal: 'Objetivo', audience: 'Audiencia', callToAction: 'Llamado a la acción' } },
    'en': { name: 'English', tag: 'en', labels: { goal: 'Goal', audience: 'Audience', callToAction: 'Call to action' } },
    'en-us': { name: 'English', tag: 'en-US', labels: { goal: 'Goal', audience: 'Audience', callToAction: 'Call to action' } },
    'en-gb': { name: 'English', tag: 'en-GB', labels: { goal: 'Goal', audience: 'Audience', callToAction: 'Call to action' } },
};

function resolveLanguageInfo(language?: string): LanguageInfo {
    if (!language) {
        return LANGUAGE_INFO_MAP['pt-br'];
    }

    const lowered = language.toLowerCase();
    if (LANGUAGE_INFO_MAP[lowered]) {
        return LANGUAGE_INFO_MAP[lowered];
    }

    const base = lowered.split(/[-_]/)[0];
    if (base && LANGUAGE_INFO_MAP[base]) {
        return LANGUAGE_INFO_MAP[base];
    }

    const capitalized = language.charAt(0).toUpperCase() + language.slice(1);
    return {
        name: capitalized,
        tag: language,
        labels: {
            goal: 'Goal',
            audience: 'Audience',
            callToAction: 'Call to action',
        },
    };
}

async function processSectionItems(rssItems: RssItem[], selectedNews?: SelectedNewsArticle[]): Promise<ProcessedArticle[]> {
    const normalizedNewsItems = (selectedNews || [])
        .filter((news) => !!news.link)
        .map((news) => ({
            title: news.title || news.link,
            link: news.link,
        })) as RssItem[];

    const combinedItems = [...rssItems, ...normalizedNewsItems];

    const results = await Promise.all(combinedItems.map((item) => processArticleItem(item)));
    return results.filter((article): article is ProcessedArticle => article !== null);
}

async function processArticleItem(item: RssItem): Promise<ProcessedArticle | null> {
    if (!item.link) {
        return null;
    }

    const url = item.link;
    const articleTitle = (item.title ?? '').trim() || 'Sem título';

    try {
        let contentLength: number | null = null;

        try {
            const headResponse = await fetch(url, { method: 'HEAD' });
            if (headResponse.ok) {
                const lengthHeader = headResponse.headers.get('content-length');
                if (lengthHeader) {
                    const parsedLength = parseInt(lengthHeader, 10);
                    if (!Number.isNaN(parsedLength)) {
                        contentLength = parsedLength;
                    }
                }
            }
        } catch (headError) {
            console.log(`⚠️  Unable to determine size for ${url}:`, headError);
        }

        if (contentLength !== null && contentLength > MAX_FILE_SIZE) {
            console.log(`⚠️  Skipping large file (${Math.round(contentLength / 1024 / 1024)}MB): ${articleTitle}`);
            return null;
        }

        const response = await fetch(url);
        if (!response.ok) {
            console.log(`❌ HTTP ${response.status} fetching ${url}`);
            return null;
        }

        const html = await response.text();
        const cleanText = extractCleanText(html);

        if (!cleanText) {
            console.log(`⚠️  No readable content found for ${url}`);
            return null;
        }

        console.log(`✅ Extracted ${cleanText.length} characters from: ${articleTitle}`);

        return {
            title: articleTitle,
            url,
            text: cleanText,
        };
    } catch (error) {
        console.log(`❌ Error processing ${url}:`, error);
        return null;
    }
}

function extractCleanText(html: string): string {
    const $ = cheerio.load(html);

    // Strip obvious noise that pollutes the extracted text
    $('script, style, nav, header, footer, aside, .ads, .advertisement, .sidebar, .menu, .social-share, .comments, .social, .share, .related, .recommendation, .navigation, .breadcrumb, button, .button, .btn, .social-links, .tags, .category, .author-info, .metadata, .date, .timestamp, .byline, .share-button, .comment-count, .like-count, iframe, .embed, .widget, .promo, .newsletter-signup, .subscription, .paywall, [class*="share"], [class*="social"], [class*="comment"], [class*="related"], [class*="sidebar"], [class*="ad"]').remove();

    const contentElement = $('article, main, .content, .post-content, .entry-content, .article-content, .story-content, [role="main"], .post-body, .article-body').first();
    const textSource = contentElement.length > 0 ? contentElement : $('body');

    return textSource
        .text()
        .replace(/\s+/g, ' ')
        .trim();
}

async function summarizeArticleWithOpenAI(article: ProcessedArticle, context: NewsletterContext): Promise<string> {
    const truncatedText = article.text.length > ARTICLE_TEXT_SUMMARY_LIMIT ? `${article.text.slice(0, ARTICLE_TEXT_SUMMARY_LIMIT)}...` : article.text;

    const systemPrompt =
        `You are a marketing assistant who summarizes articles for a curated newsletter. Always respond in ${context.languageName} (${context.languageTag}). Keep the tone informative and clear.`;

    const userPrompt = `Newsletter:
- Title: ${context.title || 'not provided'}
- Goal: ${context.goal || 'not provided'}
- Audience: ${context.audience || 'not provided'}

Article:
- Title: ${article.title}
- Link: ${article.url}

Content:
"""
${truncatedText}
"""

Summarize the article in up to five sentences, highlighting why it matters to the newsletter audience. Reply with a single paragraph written in ${context.languageName}.`;

    const summary = await callOpenAI(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        { maxTokens: 220, temperature: 0.4 },
    );

    return summary.trim();
}

async function generateSectionWithOpenAI({
    newsletter,
    section,
    articleSummaries,
}: {
    newsletter: NewsletterContext;
    section: { title: string; description?: string };
    articleSummaries: ArticleSummary[];
}): Promise<GeneratedSectionContent> {
    const insights = articleSummaries
        .map((item, index) => `${index + 1}. ${item.title}: ${item.summary}`)
        .join('\n');

    const systemPrompt =
        `You are a copywriter who crafts engaging marketing newsletter sections. All content must be written in ${newsletter.languageName} (${newsletter.languageTag}). Use a professional but warm tone.`;

    const userPrompt = `Newsletter context:
- Title: ${newsletter.title || 'not provided'}
- Goal: ${newsletter.goal || 'not provided'}
- Audience: ${newsletter.audience || 'not provided'}

Target section:
- Suggested title: ${section.title}
- Description: ${section.description || 'no description provided'}

Article insights for this section:
${insights}

Tasks:
- Create a short, catchy title.
- Write a 1-2 sentence summary that connects the insights.
- Produce a Markdown body with up to two paragraphs and add a short bullet list or call to action if appropriate.
- Adapt the language to the described audience.

Reply **only** in JSON with this structure (content in ${newsletter.languageName}):
{
  "title": "",
  "summary": "",
  "body": "",
  "callToAction": "optional, leave empty if not needed"
}`;

    const aiResponse = await callOpenAI(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        { maxTokens: 500, temperature: 0.6 },
    );

    const cleanedResponse = cleanAiJsonResponse(aiResponse);

    let parsed: any;
    try {
        parsed = JSON.parse(cleanedResponse);
    } catch (error) {
        console.error('Failed to parse AI response for section generation', cleanedResponse, error);
        throw new Meteor.Error('ai-response-invalid', 'Invalid response from AI service');
    }

    const generatedTitle = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : section.title;
    const summary = typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : articleSummaries[0].summary;
    const body = typeof parsed.body === 'string' && parsed.body.trim() ? parsed.body.trim() : insights;
    const callToActionValue =
        typeof parsed.callToAction === 'string' && parsed.callToAction.trim() ? parsed.callToAction.trim() : undefined;

    return {
        title: generatedTitle,
        summary,
        body,
        callToAction: callToActionValue,
    };
}

function buildNewsletterMarkdown(context: NewsletterContext, sections: GeneratedNewsletterSection[]): string {
    const parts = [`# ${context.title}`];

    if (context.goal) {
        parts.push(`**${context.labels.goal}:** ${context.goal}`);
    }

    if (context.audience) {
        parts.push(`**${context.labels.audience}:** ${context.audience}`);
    }

    for (const section of sections) {
        parts.push('');
        parts.push(`## ${section.generatedTitle}`);
        parts.push(section.summary);
        parts.push('');
        parts.push(section.body);
        if (section.callToAction) {
            parts.push('');
            parts.push(`**${context.labels.callToAction}:** ${section.callToAction}`);
        }
    }

    return parts.join('\n').trim();
}

async function callOpenAI(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
    const openaiApiKey = getOpenAiApiKey();

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages,
                max_tokens: options?.maxTokens ?? 400,
                temperature: options?.temperature ?? 0.7,
            }),
        });

        if (!response.ok) {
            const errorPayload = await response.text();
            console.error('OpenAI request failed', errorPayload);
            throw new Meteor.Error('ai-request-failed', 'Failed to communicate with AI service');
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            console.error('OpenAI response missing content', data);
            throw new Meteor.Error('ai-response-empty', 'Empty response from AI service');
        }
        return content;
    } catch (error) {
        if (error instanceof Meteor.Error) {
            throw error;
        }
        console.error('Unexpected error calling OpenAI', error);
        throw new Meteor.Error('ai-request-failed', 'Failed to communicate with AI service');
    }
}

function getOpenAiApiKey(): string {
    const apiKey = Meteor.settings.private?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Meteor.Error('api-key-missing', 'OpenAI API key not configured');
    }
    return apiKey;
}

function cleanAiJsonResponse(value: string): string {
    return value.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}
