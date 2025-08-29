export type RssCategory = 'technology' | 'business' | 'science' | 'sports' | 'entertainment' | 'general' | string;

export interface RssSourceModel {
    _id?: string;
    name: string;
    url: string;
    category: RssCategory;
    enabled?: boolean; // default true
    createdAt?: Date;
    updatedAt?: Date;
}

// GET
export interface MethodGetRssSourcesListModel {
    category?: string;
    enabledOnly?: boolean; // default true
}

export interface ResultGetRssSourcesListModel {
    sources: RssSourceModel[];
}

// SET
export interface MethodSetRssSourcesBulkUpsertModel {
    sources: RssSourceModel[]; // _id optional; upsert by url
}
