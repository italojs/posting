import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import {
    FetchRssInput,
    FetchRssResult,
    GenerateSectionSearchInput,
    GenerateSuggestionInput,
    GenerateSuggestionResult,
    SearchNewsInput,
    SearchNewsResult,
} from '../models';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';
import { contentsService, rssAggregationService, aiContentService, newsSearchService } from '/app/services';

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
        const result = await aiContentService.generateSuggestion({ contentTemplate, numberOfSections, language });
        return result as GenerateSuggestionResult;
    },
    'get.contents.generateSectionSearchQueries': async ({ newsletter, section, language }: GenerateSectionSearchInput) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        check(newsletter, Object);
        check(section, Object);
        check(language, String);
        check(newsletter.name, Match.Maybe(String));
        check(newsletter.audience, Match.Maybe(String));
        check(newsletter.goal, Match.Maybe(String));
        check(section.title, String);
        check(section.description, Match.Maybe(String));
        const result = await aiContentService.generateSectionSearchQueries({ newsletter, section, language });
        return result;
    },
    'get.contents.searchNews': async ({ query, language, country }: SearchNewsInput) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        check(query, String);
        check(language, Match.Maybe(String));
        check(country, Match.Maybe(String));
        const result = await newsSearchService.search({ query, language, country });
        return result as SearchNewsResult;
    },
});
