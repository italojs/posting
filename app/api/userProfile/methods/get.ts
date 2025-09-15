import { Meteor } from 'meteor/meteor';
import UserProfile from '../models';
import { userProfileService } from '/app/services';

Meteor.methods({
    'get.userProfiles.current': async (): Promise<UserProfile | undefined> => {
        const userId = Meteor.userId();
        return userProfileService.getCurrent(userId);
    },

    'get.userProfiles.rssFavorites': async () => {
        const userId = Meteor.userId();
        return userProfileService.getRssFavorites(userId);
    },
});
