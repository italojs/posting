import { Mongo } from 'meteor/mongo';
import { AvailableCollectionNames } from '../utils/models';
import { Content, ProcessedNewsletter } from './models';

const ContentsCollection = new Mongo.Collection<Content>(AvailableCollectionNames.CONTENTS);
export const ProcessedNewslettersCollection = new Mongo.Collection<ProcessedNewsletter>(AvailableCollectionNames.PROCESSED_NEWSLETTERS);

export default ContentsCollection;