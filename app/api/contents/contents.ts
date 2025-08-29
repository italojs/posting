import { Mongo } from 'meteor/mongo';
import { AvailableCollectionNames } from '../utils/models';
import { ContentModel } from './models';

const ContentsCollection = new Mongo.Collection<ContentModel>(AvailableCollectionNames.CONTENTS);

export default ContentsCollection;
