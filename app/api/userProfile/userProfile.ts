import { Mongo } from 'meteor/mongo';
import { AvailableCollectionNames } from '../utils/models';
import UserProfile from './models';

const UserProfileCollection = new Mongo.Collection<UserProfile>(AvailableCollectionNames.USER_PROFILE);

export default UserProfileCollection;
