import UserProfileCollection from '../../api/userProfile/userProfile';
import UserProfile, {
  UpdateUserProfileInput,
  UpdateUserProfilePhotoInput,
  AddUserProfileRssFavoritesInput,
  RemoveUserProfileRssFavoritesInput,
  GetUserProfileRssFavoritesResult,
} from '../../api/userProfile/models';
import { Meteor } from 'meteor/meteor';
import { clientContentError, noAuthError, notFoundError } from '/app/utils/serverErrors';
import { GetUserRolesInput, GetUserRolesResult } from '../../api/users/models';
import { isModerator, stringContainsOnlyLettersAndNumbers } from '/app/utils/checks';
import { currentUserAsync, getUserByIdAsync } from '/server/utils/meteor';
import { checkStrEmpty } from '@netsu/js-utils';

export class UserProfileService {
  async getCurrent(userId: string | null | undefined): Promise<UserProfile | undefined> {
    if (!userId) return noAuthError('User not logged in');
    return (await UserProfileCollection.findOneAsync({ userId })) as UserProfile | undefined;
  }

  async getRssFavorites(userId: string | null | undefined): Promise<GetUserProfileRssFavoritesResult> {
    if (!userId) return noAuthError('User not logged in');
    const userProfile = await UserProfileCollection.findOneAsync({ userId });
    const urls = (userProfile?.favoritesRssUrls || []).filter(Boolean);
    return { urls };
  }

  private async ensureModeratorOrSelf(requestingUserId: string, targetUserId: string) {
    if (requestingUserId === targetUserId) return;
    const currentUserRoleData: GetUserRolesInput = { userIds: [requestingUserId] };
    const currentUserRole: GetUserRolesResult = await Meteor.callAsync('get.users.roles', currentUserRoleData);
    if (!isModerator(currentUserRole.result.find((r) => r.userId === requestingUserId)?.roles ?? [])) {
      return noAuthError();
    }
  }

  async update(input: UpdateUserProfileInput) {
    const { update, userId } = input;
    const allowedFields = new Set(['firstName', 'lastName', 'username']);
    const receivedFields = Object.keys(update || {});
    const invalidFields = receivedFields.filter((f) => !allowedFields.has(f));
    if (invalidFields.length > 0) return clientContentError('Unexpected fields to update');

    let cleanedUsername = update.username ? update.username.trim() : undefined;
    const cleanedFirstName = update.firstName ? update.firstName.trim() : undefined;
    const cleanedLastName = update.lastName ? update.lastName.trim() : undefined;

    if (cleanedUsername) {
      if (cleanedUsername[0] === '@') cleanedUsername = cleanedUsername.slice(1);
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

    await this.ensureModeratorOrSelf(user._id, userId);

    const targetUser = user._id === userId ? user : await getUserByIdAsync(userId);
    if (!targetUser) return notFoundError('user account');

    await UserProfileCollection.updateAsync({ userId }, { $set: newUpdate });
    return { ok: true };
  }

  async updatePhoto(input: UpdateUserProfilePhotoInput) {
    const { userId, key } = input;
    const user = await currentUserAsync();
    if (!user) return noAuthError();

    await this.ensureModeratorOrSelf(user._id, userId);

    const targetUser = user._id === userId ? user : await getUserByIdAsync(userId);
    if (!targetUser) return notFoundError('user account');

    await UserProfileCollection.updateAsync(
      { userId },
      { $set: { photo: { key } } },
    );
    return { ok: true };
  }

  async addRssFavorites({ urls }: AddUserProfileRssFavoritesInput) {
    const user = await currentUserAsync();
    if (!user) return noAuthError();
    const cleaned = (urls || []).map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
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
  }

  async removeRssFavorites({ urls }: RemoveUserProfileRssFavoritesInput) {
    const user = await currentUserAsync();
    if (!user) return noAuthError();
    const cleaned = (urls || []).map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
    if (cleaned.length === 0) return clientContentError('No RSS URLs provided');
    const profile = await UserProfileCollection.findOneAsync({ userId: user._id });
    const remaining = (profile?.favoritesRssUrls || []).filter((u) => !cleaned.includes(u));
    await UserProfileCollection.updateAsync(
      { userId: user._id },
      { $set: { favoritesRssUrls: remaining } },
      { upsert: true } as any,
    );
    return { ok: true };
  }
}

export const userProfileService = new UserProfileService();
