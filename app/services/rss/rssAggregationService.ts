import Parser from 'rss-parser';
import RssSourcesCollection from '../../api/rssSources/rssSources';
import { RssItem } from '../../api/contents/models';

const parser = new Parser();

export class RssAggregationService {
  async fetchMultiple(urls: string[]): Promise<RssItem[]> {
    const allItems: RssItem[] = [];
    for (const url of urls) {
      try {
        const feed = await parser.parseURL(url);
        const rssSource = await RssSourcesCollection.findOneAsync({ url });
        const feedSource = rssSource?.name || feed.title || feed.description || url;
        const items = (feed.items || []).map((it: any) => ({
          title: it.title,
          link: it.link,
          isoDate: (it as any).isoDate,
          pubDate: it.pubDate,
          contentSnippet: it.contentSnippet,
          creator: it.creator || it['dc:creator'],
          author: it.author,
          source: feedSource,
          guid: it.guid || it.id,
        })) as RssItem[];
        allItems.push(...items);
      } catch (e) {
        console.log(`Failed to fetch RSS from ${url}:`, e);
      }
    }
    return allItems;
  }
}

export const rssAggregationService = new RssAggregationService();
