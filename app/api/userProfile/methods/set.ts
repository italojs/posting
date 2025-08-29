import { checkStrEmpty } from '@netsu/js-utils';
import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { GetUserRolesInput, GetUserRolesResult } from '../../roles/models';
import UserProfile, {
    UpdateUserProfileInput,
    UpdateUserProfilePhotoInput,
    AddUserProfileRssFavoritesInput,
    RemoveUserProfileRssFavoritesInput,
} from '../models';
import UserProfileCollection from '../userProfile';
import { isModerator, stringContainsOnlyLettersAndNumbers } from '/app/utils/checks';
import { clientContentError, noAuthError, notFoundError } from '/app/utils/serverErrors';
import { currentUserAsync, getUserByIdAsync } from '/server/utils/meteor';

Meteor.methods({
    'set.userProfile.update': async ({ update, userId }: UpdateUserProfileInput) => {
        check(userId, String);
        check(update, Object);

        const allowedFields = new Set(['firstName', 'lastName', 'username']);
        const receivedFields = Object.keys(update);

        const invalidFields = receivedFields.filter((field) => !allowedFields.has(field));

        if (invalidFields.length > 0) return clientContentError('Unexpected fields to update');

        check(update.firstName, Match.Optional(String));
        check(update.lastName, Match.Optional(String));
        check(update.username, Match.Optional(String));

        let cleanedUsername = update.username ? update.username.trim() : undefined;
        const cleanedFirstName = update.firstName ? update.firstName.trim() : undefined;
        const cleanedLastName = update.lastName ? update.lastName.trim() : undefined;

        if (cleanedUsername) {
            if (cleanedUsername[0] === '@') {
                cleanedUsername = cleanedUsername.slice(1);
            }
            if (cleanedUsername.length < 3) return clientContentError('Username is too short');

            if (!stringContainsOnlyLettersAndNumbers(cleanedUsername, true)) {
                return clientContentError('Username may only contain letters, numbers and _');
            }

            cleanedUsername = `@${cleanedUsername}`;

            const existingUser = await UserProfileCollection.findOneAsync({ username: cleanedUsername });
            if (existingUser) return clientContentError('Username is already taken');
        }

        if (cleanedFirstName && checkStrEmpty(cleanedFirstName)) {
            return clientContentError('First name is required');
        }

    const newUpdate: Partial<UserProfile> = {
            firstName: cleanedFirstName,
            lastName: cleanedLastName,
            username: cleanedUsername,
        };

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        if (user._id !== userId) {
            const currentUserRoleData: GetUserRolesInput = {
                userIds: [user._id],
            };

            const currentUserRole: GetUserRolesResult = await Meteor.callAsync(
                'get.roles.userRoles',
                currentUserRoleData,
            );

            if (!isModerator(currentUserRole.result.find((r) => r.userId === user._id)?.roles ?? [])) {
                return noAuthError();
            }
        }

        const currentUser = user._id === userId ? user : await getUserByIdAsync(userId);
        if (!currentUser) return notFoundError('user account');

    await UserProfileCollection.findOneAsync({ userId });

        await UserProfileCollection.updateAsync(
            { userId },
            {
                $set: newUpdate,
            },
        );

    // system logs removed
    },
    'set.userProfile.updateProfilePhoto': async ({ key, userId }: UpdateUserProfilePhotoInput) => {
        check(userId, String);
        check(key, String);

        const user = await currentUserAsync();
        if (!user) return noAuthError();

        if (user._id !== userId) {
            const currentUserRoleData: GetUserRolesInput = {
                userIds: [user._id],
            };

            const currentUserRole: GetUserRolesResult = await Meteor.callAsync(
                'get.roles.userRoles',
                currentUserRoleData,
            );

            if (!isModerator(currentUserRole.result.find((r) => r.userId === user._id)?.roles ?? [])) {
                return noAuthError();
            }
        }

        const currentUser = user._id === userId ? user : await getUserByIdAsync(userId);
        console.log({ userId, key, user, currentUser });
        if (!currentUser) return notFoundError('user account');

        await UserProfileCollection.updateAsync(
            { userId },
            {
                $set: {
                    photo: {
                        key,
                    },
                },
            },
        );

    // system logs removed
    },

    'set.userProfile.addRssFavorites': async ({ urls }: AddUserProfileRssFavoritesInput) => {
        check(urls, [String]);
        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const cleaned = (urls || [])
            .map((u) => (typeof u === 'string' ? u.trim() : ''))
            .filter(Boolean);
        if (cleaned.length === 0) return clientContentError('No RSS URLs provided');

        const profile = await UserProfileCollection.findOneAsync({ userId: user._id });
        const current = new Set((profile?.favoritesRssUrls || []).filter(Boolean));
        cleaned.forEach((u) => current.add(u));

        await UserProfileCollection.updateAsync(
            { userId: user._id },
            { $set: { favoritesRssUrls: Array.from(current) } },
            { upsert: true } as any,
        );

        return { ok: true };
    },

    'set.userProfile.removeRssFavorites': async ({ urls }: RemoveUserProfileRssFavoritesInput) => {
        check(urls, [String]);
        const user = await currentUserAsync();
        if (!user) return noAuthError();

        const cleaned = (urls || [])
            .map((u) => (typeof u === 'string' ? u.trim() : ''))
            .filter(Boolean);
        if (cleaned.length === 0) return clientContentError('No RSS URLs provided');

        const profile = await UserProfileCollection.findOneAsync({ userId: user._id });
        const remaining = (profile?.favoritesRssUrls || []).filter((u) => !cleaned.includes(u));

        await UserProfileCollection.updateAsync(
            { userId: user._id },
            { $set: { favoritesRssUrls: remaining } },
            { upsert: true } as any,
        );

        return { ok: true };
    },
});
