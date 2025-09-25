import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ReelsScriptsCollection } from '../reelsScripts';
import { GetReelsScriptsInput, GetReelsScriptsResult } from '../models';

Meteor.methods({
  async 'reelsScripts.get'(input: GetReelsScriptsInput): Promise<GetReelsScriptsResult> {
    check(input, Object);

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const { contentId, limit = 10, skip = 0 } = input;
    const query: any = { userId };

    if (contentId) {
      query.contentId = contentId;
    }

    const scripts = await ReelsScriptsCollection.find(
      query,
      {
        sort: { createdAt: -1 },
        limit,
        skip,
      }
    ).fetchAsync();

    const total = await ReelsScriptsCollection.find(query).countAsync();

    return { scripts, total };
  },

  async 'reelsScripts.getById'(scriptId: string) {
    check(scriptId, String);

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const script = await ReelsScriptsCollection.findOneAsync({
      _id: scriptId,
      userId,
    });

    if (!script) {
      throw new Meteor.Error('not-found', 'Reels script not found');
    }

    return script;
  },
});