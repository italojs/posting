import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ReelsScript } from './models';

export const ReelsScriptsCollection = new Mongo.Collection<ReelsScript>('reelsScripts');

// Indexes for better query performance
if (Meteor.isServer) {
  ReelsScriptsCollection.createIndex({ userId: 1, createdAt: -1 });
  ReelsScriptsCollection.createIndex({ contentId: 1 });
  ReelsScriptsCollection.createIndex({ userId: 1, contentId: 1 });
}