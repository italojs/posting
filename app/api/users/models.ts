/* eslint-disable import/prefer-default-export */
import { Meteor } from 'meteor/meteor';

export enum AvailableUserRoles {
    ADMIN = 'admin',
    MODERATOR = 'moderator',
}

/**
 * This model is based off of the roles collection provided by the meteor roles package
 */
export interface UserRole {
    _id: string;
    userId: string;
    roles: AvailableUserRoles[];
}

export interface UserLinkedRole {
    userId: string;
    roles: AvailableUserRoles[];
}

export interface GetUserRolesInput {
    userIds: string[];
}

export interface GetUserRolesResult {
    result: UserLinkedRole[];
}

export interface UpdateUserRolesInput {
    role: AvailableUserRoles;
    users: string[];
    removeRole?: boolean;
}

export class AppUser implements Meteor.User {
    _id!: string;

    username?: string;

    emails!: Meteor.UserEmail[];

    createdAt!: Date;

    deleted?: boolean;

    /**
     * This will be the profile ID for this user
     */
    profile!: string;

    services?: {
        password: string;
    };
}

// ---- GET METHOD MODELS ----

// ---- SET METHOD MODELS ----
export interface CreateUserInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string | undefined;
    username: string;
}
