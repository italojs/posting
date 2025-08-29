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
    rssUrls: string[];
    rssItems: RssItem[];
    networks: {
        newsletter: boolean;
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
    rssUrls: string[];
    rssItems: RssItem[];
    networks: { newsletter: boolean };
}
