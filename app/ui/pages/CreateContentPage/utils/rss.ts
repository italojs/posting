import type { RssItem } from '/app/api/contents/models';

export interface GroupedRssArticles {
    name: string;
    items: RssItem[];
}

export const groupRssItemsBySource = (items: RssItem[]): GroupedRssArticles[] => {
    const groups: Record<string, RssItem[]> = {};

    items.forEach((item) => {
        const sourceName = item.source || 'Unknown';
        if (!groups[sourceName]) groups[sourceName] = [];
        groups[sourceName].push(item);
    });

    return Object.entries(groups).map(([name, groupItems]) => ({
        name,
        items: groupItems,
    }));
};

export const rssItemKey = (item: RssItem): string => item.link || item.title || '';
