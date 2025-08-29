export interface RssItem {
    title?: string;
    link?: string;
    isoDate?: string;
    pubDate?: string;
    contentSnippet?: string;
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
    createdAt: Date;
}

// ---- GET METHOD MODELS ----
export interface FetchRssInput {
    urls: string[];
}

export interface FetchRssResult {
    items: RssItem[];
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
}
