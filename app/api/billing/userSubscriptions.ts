import { Mongo } from 'meteor/mongo';
import { AvailableCollectionNames } from '../utils/models';
import type { UserSubscription } from './models';

const UserSubscriptionsCollection = new Mongo.Collection<UserSubscription>(AvailableCollectionNames.USER_SUBSCRIPTIONS);

export default UserSubscriptionsCollection;
