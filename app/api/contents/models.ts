export interface RssItemModel {
    title?: string;
    link?: string;
    isoDate?: string;
    pubDate?: string;
    contentSnippet?: string;
}

export interface ContentModel {
    _id: string;
    userId: string;
    name: string;
    rssUrls: string[];
    rssItems: RssItemModel[];
    networks: {
        newsletter: boolean;
    };
    createdAt: Date;
}

// ---- GET METHOD MODELS ----
export interface MethodGetContentsFetchRssModel {
    urls: string[];
}

export interface ResultGetContentsFetchRssModel {
    items: RssItemModel[];
}

// ---- SET METHOD MODELS ----
export interface MethodSetContentsCreateModel {
    name: string;
    rssUrls: string[];
    rssItems: RssItemModel[];
    networks: { newsletter: boolean };
}
