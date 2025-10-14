import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import {
    FetchRssInput,
    FetchRssResult,
    GenerateSuggestionInput,
    GenerateSuggestionResult,
    GenerateSectionSearchInput,
    SearchNewsInput,
    SearchNewsResult,
    GenerateTwitterThreadInput,
} from '../models';
import { clientContentError, noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';
import { contentsService, rssAggregationService, aiContentService, newsSearchService } from '/app/services';
import { extractCleanText } from './set'; // Static import optimization

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
    'get.contents.generateSuggestion': async ({ contentTemplate, numberOfSections, language, brand }: GenerateSuggestionInput) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        if (brand) {
            check(brand, Object);
            check(brand.name, Match.Maybe(String));
            check(brand.description, Match.Maybe(String));
            check(brand.tone, Match.Maybe(String));
            check(brand.audience, Match.Maybe(String));
            check(brand.differentiators, Match.Maybe(String));
            check(brand.keywords, Match.Maybe([String]));
        }
        const result = await aiContentService.generateSuggestion({ contentTemplate, numberOfSections, language, brand });
        return result as GenerateSuggestionResult;
    },
    'get.contents.generateSectionSearchQueries': async ({ newsletter, section, language, brand }: GenerateSectionSearchInput) => {
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
        if (brand) {
            check(brand, Object);
            check(brand.name, Match.Maybe(String));
            check(brand.description, Match.Maybe(String));
            check(brand.tone, Match.Maybe(String));
            check(brand.audience, Match.Maybe(String));
            check(brand.differentiators, Match.Maybe(String));
            check(brand.keywords, Match.Maybe([String]));
        }
        const result = await aiContentService.generateSectionSearchQueries({ newsletter, section, language, brand });
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

    'get.contents.generateTwitterThread': async ({ article, brand, language }: GenerateTwitterThreadInput) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        
        // Streamlined validation
        check(article, Object);
        check(language, String);
        
        // Optional brand validation (only if provided)
        if (brand) {
            check(brand, Object);
        }
        
        return await aiContentService.generateTwitterThread({ article, brand, language });
    },

    'extract.articleText': async ({ url }: { url: string }) => {
        const user = await currentUserAsync();
        if (!user) return noAuthError();
        
        check(url, String);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Meteor.Error('fetch-error', `HTTP ${response.status}: Failed to fetch article`);
        }
        
        const html = await response.text();
        const text = extractCleanText(html);
        
        return { text };
    },
});
