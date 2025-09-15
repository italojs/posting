import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { FetchRssInput, FetchRssResult, GenerateSuggestionInput } from '../models';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';
import { contentsService, rssAggregationService, aiContentService } from '/app/services';

Meteor.methods({
    'get.contents.byId': async ({ _id }: { _id: string }) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        if (typeof _id !== 'string' || !_id) return clientContentError('ID inválido');
        const doc = await contentsService.getByIdForUser(_id, user._id);
        if (!doc) return clientContentError('Content not found');
        return doc;
    },
    'get.contents.fetchRss': async ({ urls }: FetchRssInput) => {
        check(urls, [String]);
        const items = await rssAggregationService.fetchMultiple(urls);
        const res: FetchRssResult = { items };
        return res;
    },
    'get.contents.generateSuggestion': async ({ contentTemplate, numberOfSections, language }: GenerateSuggestionInput) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        return aiContentService.generateSuggestion({ contentTemplate, numberOfSections, language });
    },
});
