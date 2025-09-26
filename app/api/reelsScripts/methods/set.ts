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

      // Check if a script already exists for this user with the same title and content
      // This prevents duplicate scripts when regenerating
      const existingScript = await ReelsScriptsCollection.findOneAsync({
        userId,
        title,
        'contentTemplate.name': contentTemplate.name,
        articleSummary,
      });

      let result;
      
      if (existingScript) {
        // Update existing script (overwrite)
        await ReelsScriptsCollection.updateAsync(existingScript._id, {
          $set: {
            script,
            contentTemplate,
            language,
            updatedAt: new Date(),
          },
        });
        result = await ReelsScriptsCollection.findOneAsync(existingScript._id);
      } else {
        // Create new script
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
        result = await ReelsScriptsCollection.findOneAsync(reelsScriptId);
      }

      return result;
    } catch (error) {
      console.error('Error creating reels script:', error);
      throw new Meteor.Error('script-generation-failed', 'Failed to generate reels script');
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