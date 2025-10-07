import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { AddRssSourceInput, BulkUpsertRssSourcesInput } from '../models';
import { rssSourcesService } from '/app/services';

Meteor.methods({
    'set.rssSources.bulkUpsert': async ({ sources }: BulkUpsertRssSourcesInput) => {
        check(sources, [Object]);

        return rssSourcesService.bulkUpsert({ sources });
    },
    'set.rssSources.addManual': async (input: AddRssSourceInput) => {
        check(input, {
            name: Match.Maybe(String),
            url: String,
            category: Match.Maybe(String),
            description: Match.Maybe(String),
        });

        return rssSourcesService.addManual(input);
    },
});
