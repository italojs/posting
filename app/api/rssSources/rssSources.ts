import { Mongo } from 'meteor/mongo';
import { RssSource } from './models';

const RssSourcesCollection = new Mongo.Collection<RssSource>('rss_sources');

export default RssSourcesCollection;
