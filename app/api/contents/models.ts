import { BrandContextForAI } from '../brands/models';

export interface RssItem {
    title?: string;
    link?: string;
    isoDate?: string;
    pubDate?: string;
    contentSnippet?: string;
    creator?: string;
    author?: string;
    source?: string;
    guid?: string;
}

export interface NewsletterSection {
    id?: string;
    title: string;
    description?: string;
    rssItems: RssItem[];
    newsSearchQueries?: string[];
    newsArticles?: SelectedNewsArticle[];
}

export interface NewsArticle {
    title: string;
    link: string;
    source?: string;
    snippet?: string;
    date?: string;
}

export interface SelectedNewsArticle extends NewsArticle {
    query?: string;
}

export interface Content {
    _id: string;
    userId: string;
    name: string;
    /** Who is this content for */
    audience?: string;
    /** What is the goal/purpose of this content */
    goal?: string;
    rssUrls: string[];
    rssItems: RssItem[];
    networks: {
        newsletter?: boolean;
        instagram?: boolean;
        twitter?: boolean;
        tiktok?: boolean;
        linkedin?: boolean;
    };
    /** Specific sections for newsletter content; each section can pick its own RSS items */
    newsletterSections?: NewsletterSection[];
    newsletterOutput?: StoredNewsletterPreview;
    brandId?: string;
    brandSnapshot?: BrandContextForAI;
    createdAt: Date;
}

export interface ProcessedArticle {
    title: string;
    url: string;
    text: string;
}

export interface ProcessedNewsletterSection {
    name: string;
    content: ProcessedArticle[];
}

export interface ProcessedNewsletter {
    _id: string;
    userId: string;
    contentId?: string; // Reference to the original Content document
    title: string;
    description: string;
    goal: string;
    audience: string;
    sections: ProcessedNewsletterSection[];
    totalArticles: number;
    processingDate: Date;
    createdAt: Date;
}

export interface GeneratedNewsletterSectionPreview {
    originalTitle: string;
    originalDescription?: string;
    articleSummaries: NewsletterArticleSummary[];
    generatedTitle: string;
    summary: string;
    body: string;
    callToAction?: string;
}

export interface GeneratedNewsletterPreview {
    title: string;
    goal?: string;
    audience?: string;
    sections: GeneratedNewsletterSectionPreview[];
    compiledMarkdown: string;
}

export interface StoredNewsletterPreview extends GeneratedNewsletterPreview {
    generatedAt: Date;
}

export interface ProcessNewsletterInput extends CreateContentInput {
    _id?: string;
    language?: string;
}

export interface NewsletterGenerationContext {
    title: string;
    goal?: string;
    audience?: string;
    brand?: BrandContextForAI;
    languageName: string;
    languageTag: string;
    currentDate: string;
    labels: {
        goal: string;
        audience: string;
        callToAction: string;
    };
}

export interface NewsletterArticleSummary {
    title: string;
    url: string;
    summary: string;
}

export interface NewsletterSectionGenerationResult {
    title: string;
    summary: string;
    body: string;
    callToAction?: string;
}

// ---- GET METHOD MODELS ----
export interface FetchRssInput {
    urls: string[];
}

export interface FetchRssResult {
    items: RssItem[];
}

export interface GenerateSuggestionInput {
    contentTemplate: Pick<CreateContentInput, 'name' | 'audience' | 'goal'>;
    numberOfSections: number;
    language: string;
    brand?: BrandContextForAI;
}

export interface SearchNewsInput {
    query: string;
    language?: string;
    country?: string;
}

export interface SearchNewsResult {
    query: string;
    articles: NewsArticle[];
}

export interface GenerateSuggestionResult {
    title: string;
    sections: {
        title: string;
        description: string;
        newsSearchQueries?: string[];
    }[];
}

export interface GenerateSectionSearchInput {
    newsletter: Pick<CreateContentInput, 'name' | 'audience' | 'goal'>;
    section: { title: string; description?: string };
    language: string;
    brand?: BrandContextForAI;
}

export interface GenerateSectionSearchResult {
    queries: string[];
}

// ---- TWITTER THREAD MODELS ----
export interface TwitterThread {
    tweets: string[];
    articleTitle: string;
    articleUrl?: string;
    source?: string;
}

export interface GenerateTwitterThreadInput {
    article: RssItem;
    brand?: BrandContextForAI;
    language: string;
}

export interface GenerateTwitterThreadResult {
    thread: TwitterThread;
}

// ---- SET METHOD MODELS ----
export interface CreateContentInput {
    name: string;
    audience?: string;
    goal?: string;
    rssUrls: string[];
    rssItems: RssItem[];
    networks: {
        newsletter?: boolean;
        instagram?: boolean;
        twitter?: boolean;
        tiktok?: boolean;
        linkedin?: boolean;
    };
    /** Optional sections for newsletter, enabling per-section item selection */
    newsletterSections?: NewsletterSection[];
    brandId?: string;
    brandSnapshot?: BrandContextForAI;
}
