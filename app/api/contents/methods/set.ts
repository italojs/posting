import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import * as cheerio from 'cheerio';
import ContentsCollection from '../contents';
import { buildNewsletterContext, normalizeContentInput } from './helpers';
import { BrandContextForAI } from '/app/api/brands/models';
import {
    Content,
    CreateContentInput,
    GeneratedNewsletterSectionPreview,
    NewsletterArticleSummary,
    NewsletterGenerationContext,
    StoredNewsletterPreview,
    NewsletterSection,
    ProcessedArticle,
    ProcessNewsletterInput,
    ProcessNewsletterSectionInput,
    RssItem,
    SelectedNewsArticle,
} from '../models';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';
import { aiContentService, brandsService } from '/app/services';

interface ResolvedBrandContext {
    brandId?: string;
    brandSnapshot?: BrandContextForAI;
}

async function resolveBrandForUser(
    userId: string,
    rawBrandId?: string | null,
    options?: { allowMissing?: boolean },
): Promise<ResolvedBrandContext> {
    const trimmed = typeof rawBrandId === 'string' ? rawBrandId.trim() : '';
    if (!trimmed) {
        return { brandId: undefined, brandSnapshot: undefined };
    }

    const brand = await brandsService.getByIdForUser(trimmed, userId);
    if (!brand) {
        if (options?.allowMissing) {
            return { brandId: undefined, brandSnapshot: undefined };
        }
        clientContentError('Marca não encontrada');
    }

    const brandSnapshot: BrandContextForAI = {
        name: brand.name,
        description: brand.description,
        tone: brand.tone,
        audience: brand.audience,
        differentiators: brand.differentiators,
        keywords: brand.keywords,
    };

    return { brandId: brand._id, brandSnapshot };
}

async function resolveBrandContextForContent({
    userId,
    rawBrandId,
    existingContent,
    allowMissing,
}: {
    userId: string;
    rawBrandId?: string | null;
    existingContent?: Content;
    allowMissing?: boolean;
}): Promise<ResolvedBrandContext> {
    const resolved = await resolveBrandForUser(userId, rawBrandId, { allowMissing });
    if (!resolved.brandSnapshot && rawBrandId == null && existingContent?.brandSnapshot) {
        return {
            brandId: existingContent.brandId,
            brandSnapshot: existingContent.brandSnapshot,
        };
    }
    return resolved;
}

Meteor.methods({
    'set.contents.create': async (payload: CreateContentInput) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const normalized = normalizeContentInput(payload);
        const { brandId: resolvedBrandId, brandSnapshot } = await resolveBrandForUser(user._id, payload.brandId);

        const doc: Omit<Content, '_id'> = {
            userId: user._id,
            name: normalized.name,
            audience: normalized.audience,
            goal: normalized.goal,
            rssUrls: normalized.rssUrls,
            rssItems: normalized.rssItems,
            networks: normalized.networks,
            newsletterSections: normalized.newsletterSections,
            brandId: resolvedBrandId,
            brandSnapshot,
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
    'set.contents.update': async (payload: CreateContentInput & { _id: string }) => {
        check(payload._id, String);
        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const existing = await ContentsCollection.findOneAsync({ _id: payload._id, userId: user._id });
        if (!existing) return clientContentError('Conteúdo não encontrado');

        const normalized = normalizeContentInput(payload);
        const { brandId: resolvedBrandId, brandSnapshot } = await resolveBrandForUser(user._id, payload.brandId);

        await ContentsCollection.updateAsync(
            { _id: payload._id, userId: user._id },
            {
                $set: {
                    name: normalized.name,
                    audience: normalized.audience,
                    goal: normalized.goal,
                    rssUrls: normalized.rssUrls,
                    rssItems: normalized.rssItems,
                    networks: normalized.networks,
                    newsletterSections: normalized.newsletterSections,
                    brandId: resolvedBrandId,
                    brandSnapshot,
                },
            },
        );
        return { _id };
    },
    'set.contents.generateNewsletterSection': async ({
        _id,
        name,
        audience,
        goal,
        section,
        language,
        brandId,
    }: ProcessNewsletterSectionInput) => {
        check(name, String);
        check(audience, Match.Maybe(String));
        check(goal, Match.Maybe(String));
        check(section, Object);
        check(section.title, Match.Maybe(String));
        check(section.description, Match.Maybe(String));
        check((section as any).rssItems, Match.Maybe([Object]));
        check((section as any).newsArticles, Match.Maybe([Object]));
        check((section as any).newsSearchQueries, Match.Maybe([String]));
        check(language, Match.Maybe(String));
        check(_id, Match.Maybe(String));
        check(brandId, Match.Maybe(String));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        let existingContent: Content | undefined;

        if (_id) {
            existingContent = (await ContentsCollection.findOneAsync({ _id, userId: user._id })) as Content | undefined;
            if (!existingContent) {
                return clientContentError('Conteúdo não encontrado');
            }
        }

        const resolvedBrand = await resolveBrandContextForContent({
            userId: user._id,
            rawBrandId: brandId,
            existingContent,
            allowMissing: true,
        });

        const newsletterContext = buildNewsletterContext({
            title: name,
            goal,
            audience,
            brand: resolvedBrand.brandSnapshot,
            language,
        });

        const normalizedSection: NewsletterSection = {
            id: section.id,
            title: (section.title || '').trim() || 'Section',
            description: section.description ? section.description.trim() : undefined,
            rssItems: Array.isArray(section.rssItems) ? section.rssItems : [],
            newsArticles: Array.isArray(section.newsArticles) ? section.newsArticles : [],
            newsSearchQueries: Array.isArray(section.newsSearchQueries) ? section.newsSearchQueries : undefined,
        };

        const hasRssItems = normalizedSection.rssItems.length > 0;
        const hasNewsArticles = Array.isArray(normalizedSection.newsArticles) && normalizedSection.newsArticles.length > 0;

        if (!hasRssItems && !hasNewsArticles) {
            return clientContentError('Selecione pelo menos um conteúdo para a seção');
        }

        const preview = await generateNewsletterSectionPreview(normalizedSection, newsletterContext);
        if (!preview) {
            return clientContentError('Não foi possível gerar conteúdo para esta seção');
        }

        return preview;
    },
    'set.contents.processNewsletter': async ({
        _id,
        name,
        audience,
        goal,
        rssUrls,
        rssItems,
        networks,
        newsletterSections,
        language,
        brandId,
        generatedSections: preGeneratedSections,
    }: ProcessNewsletterInput) => {
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
        check(_id, Match.Maybe(String));
        check(language, Match.Maybe(String));
        check(brandId, Match.Maybe(String));
        check(preGeneratedSections, Match.Maybe([Object]));

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        let contentIdForSave: string | undefined;
        let existingContent: Content | undefined;

        if (_id) {
            existingContent = (await ContentsCollection.findOneAsync({ _id, userId: user._id })) as Content | undefined;
            const ownedContent = existingContent;
            if (!ownedContent) {
                return clientContentError('Conteúdo não encontrado');
            }
            contentIdForSave = _id;
        }

        const resolvedBrand = await resolveBrandContextForContent({
            userId: user._id,
            rawBrandId: brandId,
            existingContent,
            allowMissing: true,
        });

        if ((!newsletterSections || newsletterSections.length === 0) && (!preGeneratedSections || preGeneratedSections.length === 0)) {
            return { success: false, error: 'No sections available for processing', processedLinks: 0 };
        }

        const newsletterContext = buildNewsletterContext({
            title: name,
            goal,
            audience,
            brand: resolvedBrand.brandSnapshot,
            language,
        });

        let generatedSections: GeneratedNewsletterSectionPreview[] = normalizeGeneratedSections(preGeneratedSections);

        if (generatedSections.length === 0) {
            const normalizedSections = (newsletterSections || []).map((section: NewsletterSection, index) => ({
                ...section,
                title: section.title || `Section ${index + 1}`,
                rssItems: Array.isArray(section.rssItems) ? section.rssItems : [],
                newsArticles: Array.isArray(section.newsArticles) ? section.newsArticles : [],
            }));

            for (const section of normalizedSections) {
                const preview = await generateNewsletterSectionPreview(section, newsletterContext);
                if (preview) {
                    generatedSections.push(preview);
                }
            }

            if (generatedSections.length === 0) {
                return { success: false, error: 'Unable to generate newsletter sections', processedLinks: 0 };
            }
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

        if (contentIdForSave) {
            const storedPreview: StoredNewsletterPreview = {
                ...finalNewsletter,
                generatedAt: new Date(),
            };

            await ContentsCollection.updateAsync(
                { _id: contentIdForSave, userId: user._id },
                {
                    $set: {
                        newsletterOutput: storedPreview,
                    },
                },
            );
        }

        return finalNewsletter;
    },
});

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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

async function generateNewsletterSectionPreview(
    section: NewsletterSection,
    newsletterContext: NewsletterGenerationContext,
): Promise<GeneratedNewsletterSectionPreview | null> {
    const processedArticles = await processSectionItems(section.rssItems || [], section.newsArticles);
    if (processedArticles.length === 0) {
        return null;
    }

    const articleSummaries: NewsletterArticleSummary[] = [];

    for (const article of processedArticles) {
        try {
            const summary = await aiContentService.summarizeNewsletterArticle({
                article,
                context: newsletterContext,
            });
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
        return null;
    }

    try {
        const generatedContent = await aiContentService.generateNewsletterSection({
            newsletter: newsletterContext,
            section: {
                title: section.title,
                description: section.description,
            },
            articleSummaries,
        });

        return {
            originalTitle: section.title,
            originalDescription: section.description,
            articleSummaries,
            generatedTitle: generatedContent.title,
            summary: generatedContent.summary,
            body: generatedContent.body,
            callToAction: generatedContent.callToAction,
        };
    } catch (error) {
        console.error('Failed to generate newsletter section content', section.title, error);
        return null;
    }
}

function normalizeGeneratedSections(rawSections?: any[]): GeneratedNewsletterSectionPreview[] {
    if (!Array.isArray(rawSections)) {
        return [];
    }

    const normalized: GeneratedNewsletterSectionPreview[] = [];

    for (const entry of rawSections) {
        if (!entry || typeof entry !== 'object') continue;

        const generatedTitle = typeof entry.generatedTitle === 'string' ? entry.generatedTitle.trim() : '';
        const summary = typeof entry.summary === 'string' ? entry.summary.trim() : '';
        const body = typeof entry.body === 'string' ? entry.body.trim() : '';
        if (!generatedTitle || !body) continue;

        const rawArticleSummaries = Array.isArray(entry.articleSummaries) ? entry.articleSummaries : [];
        const articleSummaries = rawArticleSummaries
            .map((item: any) => {
                if (!item || typeof item !== 'object') return null;
                const title = typeof item.title === 'string' ? item.title : undefined;
                const url = typeof item.url === 'string' ? item.url : undefined;
                const summaryText = typeof item.summary === 'string' ? item.summary : undefined;
                if (!title && !summaryText) return null;
                const normalizedSummary: NewsletterArticleSummary = {
                    title: (title || summaryText || 'Untitled').trim(),
                    url: url || '',
                    summary: (summaryText || '').trim(),
                };
                return normalizedSummary;
            })
            .filter((item: NewsletterArticleSummary | null): item is NewsletterArticleSummary => !!item);

        if (articleSummaries.length === 0) continue;

        const normalizedSection: GeneratedNewsletterSectionPreview = {
            originalTitle:
                typeof entry.originalTitle === 'string' && entry.originalTitle.trim()
                    ? entry.originalTitle.trim()
                    : generatedTitle,
            originalDescription:
                typeof entry.originalDescription === 'string' && entry.originalDescription.trim()
                    ? entry.originalDescription.trim()
                    : undefined,
            articleSummaries,
            generatedTitle,
            summary: summary || articleSummaries[0].summary,
            body,
            callToAction:
                typeof entry.callToAction === 'string' && entry.callToAction.trim()
                    ? entry.callToAction.trim()
                    : undefined,
        };

        normalized.push(normalizedSection);
    }

    return normalized;
}

function buildNewsletterMarkdown(
    context: NewsletterGenerationContext,
    sections: GeneratedNewsletterSectionPreview[],
): string {
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

// Helper function to extract full article text from URL
async function extractArticleText(article: any): Promise<string | null> {
    if (!article || typeof article !== 'object' || !article.link) {
        return null;
    }

    const processed = await processArticleItem(article as RssItem);
    return processed?.text ?? null;
}

export { extractCleanText, extractArticleText };
