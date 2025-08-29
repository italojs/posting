import { Mongo } from 'meteor/mongo';
import { RssSourceModel } from './models';

const RssSourcesCollection = new Mongo.Collection<RssSourceModel>('rss_sources');

export default RssSourcesCollection;
