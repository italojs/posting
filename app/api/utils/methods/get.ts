import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import UserProfileCollection from '../../userProfile/userProfile';
import ContentsCollection, { ProcessedNewslettersCollection } from '../../contents/contents';
import BrandsCollection from '../../brands/brands';
import { AvailableCollectionNames, FindCollectionParams } from '../models';
import { MongoDBSelector } from '/app/types/interfaces';
import { internalServerError } from '/app/utils/serverErrors';

Meteor.methods({
    'utilMethods.findCollection': async function ({
        collection,
        onlyOne,
        selector = {},
        options = {},
        includeDeleted = false,
        count = false,
    }: FindCollectionParams) {
        const collectionMap: Record<AvailableCollectionNames, any> = {
            [AvailableCollectionNames.USER_PROFILE]: UserProfileCollection,
            [AvailableCollectionNames.USERS]: Meteor.users,
            [AvailableCollectionNames.CONTENTS]: ContentsCollection,
            [AvailableCollectionNames.PROCESSED_NEWSLETTERS]: ProcessedNewslettersCollection,
            [AvailableCollectionNames.BRANDS]: BrandsCollection,
        } as any;

        const collectionInstance = collectionMap[collection];

        if (!collectionInstance) {
            return internalServerError('Collection provided does not exist');
        }

        let query: MongoDBSelector = {
            _id: selector,
            $or: [
                {
                    deleted: false,
                },
                {
                    deleted: {
                        $exists: false,
                    },
                },
            ],
        };

        if (typeof selector === 'object') {
            query = {
                $and: [
                    {
                        ...selector,
                    },
                    {
                        $or: [
                            {
                                deleted: false,
                            },
                            {
                                deleted: {
                                    $exists: false,
                                },
                            },
                        ],
                    },
                ],
            };
        }

        if (onlyOne) {
            // use a generic collection type since POSTS/POST_LIKES were removed
            const res = await (collectionInstance as Mongo.Collection<any>).findOneAsync(
                includeDeleted ? selector : query,
                {
                    ...options,
                    transform: undefined,
                },
            );
            return res;
        }

        if (count) {
            const res = await collectionInstance.find(includeDeleted ? selector : query, options).countAsync();
            return res;
        }

        const res = await collectionInstance.find(includeDeleted ? selector : query, options).fetchAsync();

        return res;
    },
});
