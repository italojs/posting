/* eslint-disable import/prefer-default-export */
import { Meteor } from 'meteor/meteor';

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
