import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';

if (Meteor.isClient) {
    // Handle password reset links from email
    Accounts.onResetPasswordLink((token: string, done: () => void) => {
        window.location.href = `/reset-password/${token}`;
        done();
    });
}