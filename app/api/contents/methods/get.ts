import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Parser from 'rss-parser';
import { Content, FetchRssInput, FetchRssResult, RssItem } from '../models';
import ContentsCollection from '../contents';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';

const parser = new Parser();

Meteor.methods({
    'get.contents.byId': async ({ _id }: { _id: string }) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        if (typeof _id !== 'string' || !_id) return clientContentError('ID inválido');
        const doc = (await ContentsCollection.findOneAsync({ _id, userId: user._id })) as Content | undefined;
        if (!doc) return clientContentError('Conteúdo não encontrado');
        return doc;
    },
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
