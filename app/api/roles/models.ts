export enum AvailableUserRoles {
    ADMIN = 'admin',
    MODERATOR = 'moderator',
}

/**
 * This model is based off of the roles collection provided by the meteor roles package
 */
interface Role {
    _id: string;
    userId: string;
    roles: AvailableUserRoles[];
}

export default Role;

// ---- GET METHOD MODELS ----
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

// ---- SET METHOD MODELS ----
export interface UpdateUserRolesInput {
    role: AvailableUserRoles;
    users: string[];
    removeRole?: boolean;
}
