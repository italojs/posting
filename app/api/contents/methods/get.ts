import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Parser from 'rss-parser';
import { FetchRssInput, FetchRssResult, RssItem } from '../models';

const parser = new Parser();

Meteor.methods({
    'get.contents.fetchRss': async ({ urls }: FetchRssInput) => {
        check(urls, [String]);

    const allItems: RssItem[] = [];

        for (const url of urls) {
            try {
                const feed = await parser.parseURL(url);
                const items = (feed.items || []).map((it: any) => ({
                    title: it.title,
                    link: it.link,
                    isoDate: (it as any).isoDate,
                    pubDate: it.pubDate,
                    contentSnippet: it.contentSnippet,
                })) as RssItem[];
                allItems.push(...items);
            } catch (e) {
                // ignore single feed failure; continue others
            }
        }

    const res: FetchRssResult = {
            items: allItems,
        };

        return res;
    },
});
