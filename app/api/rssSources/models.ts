export type RssCategory = 'technology' | 'business' | 'science' | 'sports' | 'entertainment' | 'general' | string;

export interface RssSource {
    _id?: string;
    name: string;
    url: string;
    category: RssCategory;
    enabled?: boolean; // default true
    createdAt?: Date;
    updatedAt?: Date;
}

// GET
export interface GetRssSourcesListInput {
    category?: string;
    enabledOnly?: boolean; // default true
}

export interface GetRssSourcesListResult {
    sources: RssSource[];
}

// SET
export interface BulkUpsertRssSourcesInput {
    sources: RssSource[]; // _id optional; upsert by url
}
