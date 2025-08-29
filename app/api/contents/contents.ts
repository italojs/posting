import { Mongo } from 'meteor/mongo';
import { AvailableCollectionNames } from '../utils/models';
import { Content } from './models';

const ContentsCollection = new Mongo.Collection<Content>(AvailableCollectionNames.CONTENTS);

export default ContentsCollection;
