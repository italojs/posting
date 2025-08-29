import { Roles } from 'meteor/alanning:roles';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { AvailableUserRoles, GetUserRolesInput, UpdateUserRolesInput, GetUserRolesResult } from '../models';
import { noAuthError } from '/app/utils/serverErrors';
import { currentUserAsync } from '/server/utils/meteor';

Meteor.methods({
    'set.roles.updateUserRoles': async function ({ role, users, removeRole }: UpdateUserRolesInput) {
        check(users, [String]);

        const currentUser = await currentUserAsync();
        if (!currentUser) return noAuthError();

    const currentUserRoleData: GetUserRolesInput = {
            userIds: users,
        };

    const currentUserRole: GetUserRolesResult = await Meteor.callAsync(
            'get.roles.userRoles',
            currentUserRoleData,
        );

        if (!currentUserRole.result.find((r) => r.roles.includes(AvailableUserRoles.ADMIN))) {
            // only admins can apply roles to users
            return noAuthError();
        }

    const data: GetUserRolesInput = {
            userIds: users,
        };

    const res: GetUserRolesResult = await Meteor.callAsync('get.roles.userRoles', data);

        if (removeRole) {
            if (res.result.find((r) => r.roles.includes(AvailableUserRoles.ADMIN))) {
                // an admins role cannot be revoked
                return noAuthError();
            }

            await Roles.removeUsersFromRolesAsync(users, [role]);
        } else {
            await Roles.addUsersToRolesAsync(users, [role]);
        }
    },
});
