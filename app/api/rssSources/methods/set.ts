import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { BulkUpsertRssSourcesInput } from '../models';
import { rssSourcesService } from '/app/services';

Meteor.methods({
    'set.rssSources.bulkUpsert': async ({ sources }: BulkUpsertRssSourcesInput) => {
        check(sources, [Object]);

        return rssSourcesService.bulkUpsert({ sources });
    },
});
