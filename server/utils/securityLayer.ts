/* eslint-disable import/prefer-default-export */
import { Meteor } from 'meteor/meteor';
import UserProfileCollection from '/app/api/userProfile/userProfile';

export const denyClientSideDatabaseActions = () => {
    // Deny all client-side updates to user documents (security layer)
    Meteor.users?.deny({
        insert() {
            return true;
        },
        update() {
            return true;
        },
        remove() {
            return true;
        },
    });

    UserProfileCollection.deny({
        insert() {
            return true;
        },
        update() {
            return true;
        },
        remove() {
            return true;
        },
    });
};
