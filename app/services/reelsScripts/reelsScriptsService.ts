import { Meteor } from 'meteor/meteor';
import { 
  CreateReelsScriptInput, 
  UpdateReelsScriptInput, 
  GetReelsScriptsInput, 
  GetReelsScriptsResult,
  ReelsScript 
} from '../../api/reelsScripts/models';

export class ReelsScriptsService {
  /**
   * Create a new reels script
   */
  async createScript(input: CreateReelsScriptInput): Promise<ReelsScript> {
    return new Promise((resolve, reject) => {
      Meteor.call('reelsScripts.create', input, (error: any, result: ReelsScript) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Get reels scripts with pagination
   */
  async getScripts(input: GetReelsScriptsInput = {}): Promise<GetReelsScriptsResult> {
    return new Promise((resolve, reject) => {
      Meteor.call('reelsScripts.get', input, (error: any, result: GetReelsScriptsResult) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Get a specific reels script by ID
   */
  async getScriptById(scriptId: string): Promise<ReelsScript> {
    return new Promise((resolve, reject) => {
      Meteor.call('reelsScripts.getById', scriptId, (error: any, result: ReelsScript) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Regenerate a reels script by creating a new one with the same parameters
   * This is a clean approach that reuses the create method
   */
  async regenerateScript(existingScriptData: {
    title: string;
    contentTemplate: any;
    articleSummary: string;
    language: string;
    contentId?: string;
  }): Promise<ReelsScript> {
    // Simply create a new script with the same parameters
    return this.createScript(existingScriptData);
  }

  /**
   * Update a reels script
   */
  async updateScript(input: UpdateReelsScriptInput): Promise<ReelsScript> {
    return new Promise((resolve, reject) => {
      Meteor.call('reelsScripts.update', input, (error: any, result: ReelsScript) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Delete a reels script
   */
  async deleteScript(scriptId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      Meteor.call('reelsScripts.delete', scriptId, (error: any, result: number) => {
        if (error) {
          reject(error);
        } else {
          resolve(result > 0);
        }
      });
    });
  }
}

export const reelsScriptsService = new ReelsScriptsService();