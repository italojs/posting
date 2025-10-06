import { Mongo } from 'meteor/mongo';
import { AvailableCollectionNames } from '../utils/models';
import type { NewsletterUsage } from './models';

const NewsletterUsageCollection = new Mongo.Collection<NewsletterUsage>(AvailableCollectionNames.NEWSLETTER_USAGE);

export default NewsletterUsageCollection;
