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
   * Regenerate a reels script using AI
   */
  async regenerateScript(scriptId: string): Promise<ReelsScript> {
    return new Promise((resolve, reject) => {
      Meteor.call('reelsScripts.regenerate', scriptId, (error: any, result: ReelsScript) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
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