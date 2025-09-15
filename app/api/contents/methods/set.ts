import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import * as cheerio from 'cheerio';
import ContentsCollection from '../contents';
import { Content, CreateContentInput, NewsletterSection, RssItem } from '../models';
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
        const normalizedSections: NewsletterSection[] | undefined = (newsletterSections || [])
            .map((s: any) => ({
                id: typeof s.id === 'string' ? s.id : undefined,
                title: typeof s.title === 'string' ? s.title.trim() : '',
                description: typeof s.description === 'string' ? s.description.trim() : undefined,
                rssItems: Array.isArray(s.rssItems) ? (s.rssItems as RssItem[]) : [],
            }))
            .filter((s) => !!s.title);

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
            newsletterSections: normalizedSections && normalizedSections.length > 0 ? normalizedSections : undefined,
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

        const normalizedSections: NewsletterSection[] | undefined = (newsletterSections || [])
            .map((s: any) => ({
                id: typeof s.id === 'string' ? s.id : undefined,
                title: typeof s.title === 'string' ? s.title.trim() : '',
                description: typeof s.description === 'string' ? s.description.trim() : undefined,
                rssItems: Array.isArray(s.rssItems) ? (s.rssItems as RssItem[]) : [],
            }))
            .filter((s) => !!s.title);

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
                    newsletterSections: normalizedSections && normalizedSections.length > 0 ? normalizedSections : undefined,
                },
            },
        );
        return { _id };
    },
    'set.contents.saveHtmls': async ({ name, audience, goal, rssUrls, rssItems, networks, newsletterSections }: CreateContentInput) => {
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

        // Early return if no newsletter sections
        if (!newsletterSections) {
            return { success: true, processedLinks: 0 };
        }

        let totalProcessed = 0;

        // Process each newsletter section
        for (const [index, section] of newsletterSections.entries()) {
            console.log(`\n=== Processing Section ${index + 1}: ${section.title} ===`);
            
            // Skip section if no RSS items
            if (!section.rssItems || section.rssItems.length === 0) {
                continue;
            }

            // Process each item in the section
            for (const item of section.rssItems) {
                // Skip item if no link
                if (!item.link) {
                    continue;
                }

                const processed = await processArticleItem(item);
                if (processed) {
                    totalProcessed++;
                }
            }
        }

        return { success: true, processedLinks: totalProcessed };
    },
});

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PREVIEW_TEXT_LENGTH = 1000;

// Helper function to process individual article item
async function processArticleItem(item: any): Promise<boolean> {
    console.log(`Processing: ${item.link}`);
    
    try {
        // Check file size first using HEAD request
        const headResponse = await fetch(item.link, { method: 'HEAD' });
        const contentLength = headResponse.headers.get('content-length');
        
        if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
            console.log(`⚠️  Skipping large file (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB): ${item.title}`);
            return false;
        }

        // Fetch HTML and process immediately in memory
        const response = await fetch(item.link);
        const html = await response.text();
        
        // Extract clean text directly with cheerio
        const $ = cheerio.load(html);
        
        // Remove all unwanted elements in one go
        $('script, style, nav, header, footer, aside, .ads, .advertisement, .sidebar, .menu, .social-share, .comments, .social, .share, .related, .recommendation, .navigation, .breadcrumb, button, .button, .btn, .social-links, .tags, .category, .author-info, .metadata, .date, .timestamp, .byline, .share-button, .comment-count, .like-count, iframe, .embed, .widget, .promo, .newsletter-signup, .subscription, .paywall, [class*="share"], [class*="social"], [class*="comment"], [class*="related"], [class*="sidebar"], [class*="ad"]').remove();
        
        // Get clean content from main article area
        const contentElement = $('article, main, .content, .post-content, .entry-content, .article-content, .story-content, [role="main"], .post-body, .article-body').first();
        const cleanText = (contentElement.length > 0 ? contentElement : $('body'))
            .text()
            .replace(/\s+/g, ' ')
            .trim();
        
        // Log the processed content
        logExtractedContent(item, html, cleanText);
        
        return true;
    } catch (error) {
        console.log(`❌ Error processing ${item.link}:`, error);
        return false;
    }
}

// Helper function to log extracted content
function logExtractedContent(item: any, html: string, cleanText: string): void {
    console.log(`\n=== CLEAN ARTICLE TEXT ===`);
    console.log(`Title: ${item.title || 'No title'}`);
    console.log(`URL: ${item.link}`);
    console.log(`HTML Size: ${Math.round(html.length / 1024)}KB`);
    console.log(`Extracted Text: ${cleanText.length} characters`);
    console.log('---');
    console.log(cleanText.substring(0, PREVIEW_TEXT_LENGTH));
    if (cleanText.length > PREVIEW_TEXT_LENGTH) {
        console.log('...[text truncated]');
    }
    console.log('---\n');
}
