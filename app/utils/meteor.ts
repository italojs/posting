import _ from "lodash";
import { AppUser } from "../api/users/models";

/**
 * Get a users email.
 *
 * NOTE: This will return the users *first* email, so it may return unexpected
 * results if the user has multiple emails
 *
 * @param user Meteor user model
 * @returns user email
 */
export const getUserEmail = (user: Pick<AppUser, "emails"> | undefined) => {
	// TODO: remove lodash
	return _.first(user?.emails)?.address;
};
