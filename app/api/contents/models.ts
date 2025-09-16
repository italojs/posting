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
}

export interface GenerateSuggestionResult {
    title: string;
    sections: {
        title: string;
        description: string;
    }[];
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
}
