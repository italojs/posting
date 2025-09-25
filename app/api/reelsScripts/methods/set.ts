import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ReelsScriptsCollection } from '../reelsScripts';
import { CreateReelsScriptInput, UpdateReelsScriptInput } from '../models';
import { aiContentService } from '../../../services/ai/aiContentService';

Meteor.methods({
  async 'reelsScripts.create'(input: CreateReelsScriptInput) {
    check(input, Object);

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const { contentId, title, contentTemplate, articleSummary, language } = input;

    try {
      // Generate the script using AI
      const script = await aiContentService.generateReelsScript({
        contentTemplate,
        articleSummary,
        language,
      });

      // Save to database
      const reelsScriptId = await ReelsScriptsCollection.insertAsync({
        userId,
        contentId,
        title,
        contentTemplate,
        articleSummary,
        language,
        script,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return await ReelsScriptsCollection.findOneAsync(reelsScriptId);
    } catch (error) {
      console.error('Error creating reels script:', error);
      throw new Meteor.Error('script-generation-failed', 'Failed to generate reels script');
    }
  },

  async 'reelsScripts.regenerate'(scriptId: string) {
    check(scriptId, String);

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const existingScript = await ReelsScriptsCollection.findOneAsync({
      _id: scriptId,
      userId,
    });

    if (!existingScript) {
      throw new Meteor.Error('not-found', 'Reels script not found');
    }

    try {
      // Regenerate the script
      const newScript = await aiContentService.generateReelsScript({
        contentTemplate: existingScript.contentTemplate,
        articleSummary: existingScript.articleSummary,
        language: existingScript.language,
      });

      // Update the script
      await ReelsScriptsCollection.updateAsync(scriptId, {
        $set: {
          script: newScript,
          updatedAt: new Date(),
        },
      });

      return await ReelsScriptsCollection.findOneAsync(scriptId);
    } catch (error) {
      console.error('Error regenerating reels script:', error);
      throw new Meteor.Error('script-regeneration-failed', 'Failed to regenerate reels script');
    }
  },

  async 'reelsScripts.update'(input: UpdateReelsScriptInput) {
    check(input, Object);

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const { _id, ...updateData } = input;

    const existingScript = await ReelsScriptsCollection.findOneAsync({
      _id,
      userId,
    });

    if (!existingScript) {
      throw new Meteor.Error('not-found', 'Reels script not found');
    }

    await ReelsScriptsCollection.updateAsync(_id, {
      $set: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return await ReelsScriptsCollection.findOneAsync(_id);
  },

  async 'reelsScripts.delete'(scriptId: string) {
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

    return await ReelsScriptsCollection.removeAsync(scriptId);
  },
});