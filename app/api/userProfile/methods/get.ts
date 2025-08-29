import { Meteor } from 'meteor/meteor';
import UserProfile, { GetUserProfileRssFavoritesResult } from '../models';
import UserProfileCollection from '../userProfile';
import { noAuthError } from '/app/utils/serverErrors';

Meteor.methods({
    'get.userProfiles.current': async (): Promise<UserProfile | undefined> => {
        const userId = Meteor.userId();
        if (!userId) return noAuthError('User not logged in');

        const userProfile = await UserProfileCollection.findOneAsync({ userId });
        return userProfile;
    },

    'get.userProfiles.rssFavorites': async (): Promise<GetUserProfileRssFavoritesResult> => {
        const userId = Meteor.userId();
        if (!userId) return noAuthError('User not logged in');

        const userProfile = await UserProfileCollection.findOneAsync({ userId });
        const urls = (userProfile?.favoritesRssUrls || []).filter(Boolean);
        return { urls };
    },
});
