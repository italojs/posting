import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Parser from 'rss-parser';
import { MethodGetContentsFetchRssModel, ResultGetContentsFetchRssModel, RssItemModel } from '../models';

const parser = new Parser();

Meteor.methods({
    'get.contents.fetchRss': async ({ urls }: MethodGetContentsFetchRssModel) => {
        check(urls, [String]);

        const allItems: RssItemModel[] = [];

        for (const url of urls) {
            try {
                const feed = await parser.parseURL(url);
                const items = (feed.items || []).map((it: any) => ({
                    title: it.title,
                    link: it.link,
                    isoDate: (it as any).isoDate,
                    pubDate: it.pubDate,
                    contentSnippet: it.contentSnippet,
                })) as RssItemModel[];
                allItems.push(...items);
            } catch (e) {
                // ignore single feed failure; continue others
            }
        }

        const res: ResultGetContentsFetchRssModel = {
            items: allItems,
        };

        return res;
    },
});
