import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import RssSourcesCollection from '../rssSources';
import { MethodGetRssSourcesListModel, ResultGetRssSourcesListModel } from '../models';

Meteor.methods({
    'get.rssSources.list': async ({ category, enabledOnly = true }: MethodGetRssSourcesListModel) => {
        check(category, Match.Maybe(String));
        check(enabledOnly, Match.Maybe(Boolean));

        const query: any = {};
        if (category && category !== 'all') query.category = category;
        if (enabledOnly) query.enabled = { $ne: false };

        const sources = await RssSourcesCollection.find(query, { sort: { name: 1 } }).fetchAsync();
        const res: ResultGetRssSourcesListModel = { sources };
        return res;
    },
});
