import { Meteor } from 'meteor/meteor';
import UserProfileModel, { ResultGetUserProfileRssFavoritesModel } from '../models';
import UserProfileCollection from '../userProfile';
import { noAuthError } from '/app/utils/serverErrors';

Meteor.methods({
    'get.userProfiles.current': async (): Promise<UserProfileModel | undefined> => {
        const userId = Meteor.userId();
        if (!userId) return noAuthError('User not logged in');

        const userProfile = await UserProfileCollection.findOneAsync({ userId });
        return userProfile;
    },

    'get.userProfiles.rssFavorites': async (): Promise<ResultGetUserProfileRssFavoritesModel> => {
        const userId = Meteor.userId();
        if (!userId) return noAuthError('User not logged in');

        const userProfile = await UserProfileCollection.findOneAsync({ userId });
        const urls = (userProfile?.favoritesRssUrls || []).filter(Boolean);
        return { urls };
    },
});
