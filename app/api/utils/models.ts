import { SearchParams } from '/app/types/interfaces';

export enum AvailableCollectionNames {
    USERS = 'users',
    USER_PROFILE = 'user_profiles',
    CONTENTS = 'contents',
    PROCESSED_NEWSLETTERS = 'processed_newsletters',
}

export interface FindCollectionParams extends SearchParams {
    collection: AvailableCollectionNames;
    /**
     * If provided, deleted documents will also be provided. If `onlyOne` is used, below will not be used.
     */
    includeDeleted?: boolean;
    count?: boolean;
}
