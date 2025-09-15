import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { GetRssSourcesListInput } from '../models';
import { rssSourcesService } from '/app/services';

Meteor.methods({
    'get.rssSources.list': async ({ category, enabledOnly = true }: GetRssSourcesListInput) => {
        check(category, Match.Maybe(String));
        check(enabledOnly, Match.Maybe(Boolean));

        return rssSourcesService.list({ category, enabledOnly });
    },
});
