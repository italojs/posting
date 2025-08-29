export interface Photo {
    key: string;
    // you can save other information here like file type and size
}

interface UserProfile {
    _id: string;
    /**
     * User this profile is linked to
     */
    userId: string;
    /**
     * The first name of the user
     */
    firstName: string;
    /**
     * The last name of the user
     */
    lastName?: string;
    /**
     * There is a username field on the user model itself, but this feels more useful since we'll almost always
     * access the user profile instead of user account
     */
    username: string;
    photo?: Photo;

    /**
     * User's favorite RSS feed URLs
     */
    favoritesRssUrls?: string[];
}

export default UserProfile;

// ---- GET METHOD MODELS ----

// ---- SET METHOD MODELS ----
export interface UpdateUserProfileInput {
    update: Partial<UserProfile>;
    userId: string;
}

export interface UpdateUserProfilePhotoInput {
    key: string;
    userId: string;
}

// ---- FAVORITES (RSS) GET/SET MODELS ----
export interface GetUserProfileRssFavoritesResult {
    urls: string[];
}

export interface AddUserProfileRssFavoritesInput {
    urls: string[]; // absolute URLs
}

export interface RemoveUserProfileRssFavoritesInput {
    urls: string[]; // absolute URLs
}
