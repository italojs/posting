import { check, Match } from 'meteor/check';
import { UpdateUserProfileInput, UpdateUserProfilePhotoInput, AddUserProfileRssFavoritesInput, RemoveUserProfileRssFavoritesInput } from '../models';
import { userProfileService } from '/app/services';

Meteor.methods({
    'set.userProfile.update': async ({ update, userId }: UpdateUserProfileInput) => {
        check(userId, String);
        check(update, Object);
        check(update.firstName, Match.Optional(String));
        check(update.lastName, Match.Optional(String));
        check(update.username, Match.Optional(String));
        check(update.preferredLanguage, Match.Optional(Match.Where((lang: any) => {
            return ['pt', 'en', 'es'].includes(lang);
        })));
        return userProfileService.update({ update, userId });
    },
    'set.userProfile.updateProfilePhoto': async ({ key, userId }: UpdateUserProfilePhotoInput) => {
        check(userId, String);
        check(key, String);
        return userProfileService.updatePhoto({ key, userId });
    },

    'set.userProfile.addRssFavorites': async ({ urls }: AddUserProfileRssFavoritesInput) => {
        check(urls, [String]);
        return userProfileService.addRssFavorites({ urls });
    },

    'set.userProfile.removeRssFavorites': async ({ urls }: RemoveUserProfileRssFavoritesInput) => {
        check(urls, [String]);
        return userProfileService.removeRssFavorites({ urls });
    },
});
