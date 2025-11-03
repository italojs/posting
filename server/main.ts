import * as dotenv from 'dotenv';

// load variables from .env
dotenv.config();

// debug: verify if the variables were loaded
console.log('[SERVER STARTUP] OPENAI_API_KEY loaded from .env:', !!process.env.OPENAI_API_KEY);

import { Roles } from 'meteor/alanning:roles';
import { Meteor } from 'meteor/meteor';
import { createDefaultUserAccount } from './utils/dummyData';
import { denyClientSideDatabaseActions } from './utils/securityLayer';
import { configureAccountsEmails } from './utils/emailConfig';
import { AvailableUserRoles, AppUser } from '/app/api/users/models';

// methods
import '/app/api/userProfile/methods';
import '/app/api/users/methods';
import '/app/api/utils/methods';
import '/app/api/contents/methods';
import '/app/api/rssSources/methods';
import '/app/api/brands/methods';

// databases
import '/app/api/userProfile/userProfile';
import '/app/api/contents/contents';
import '/app/api/rssSources/rssSources';
import '/app/api/brands/brands';

// publications

Meteor.startup(async () => {
<<<<<<< HEAD
    configureAccountsEmails();

=======
    //console log mongo_url for debugging
    console.log('[SERVER STARTUP] MONGO_URL:', process.env.MONGO_URL);
>>>>>>> bd899fe42fa1fe1333a33752b82c4864606c4b6b
    // Deny all client-side updates to user documents (security layer)
    console.log('Denying all client-side database updates');
    denyClientSideDatabaseActions();

    let defaultUser = await Meteor.users.findOneAsync({ 'emails.address': 'admin@gmail.com' });

    if (!defaultUser) {
        // for development only remove before production
        console.log('Creating default user account');
        await createDefaultUserAccount();

        defaultUser = (await Meteor.users.findOneAsync({ 'emails.address': 'admin@gmail.com' })) as
            | AppUser
            | undefined;

        if (!defaultUser) {
            // if we cannot get the default user, we may have db connection issues
            throw new Error('Could not fetch default user... Were they created?');
        }
        console.log('[DONE] Creating default user account');

        console.log('Creating default site roles');
        await Promise.all(
            Object.values(AvailableUserRoles).map(async (role) => {
                await Roles.createRoleAsync(role);
            }),
        );

        await Roles.addUsersToRolesAsync(defaultUser._id, [AvailableUserRoles.ADMIN, AvailableUserRoles.MODERATOR]);

        console.log('All default data has been created');
    }

    console.log('Startup complete');
});
