import { Meteor } from 'meteor/meteor';
import { newsFeederService } from '../../../server/utils/newsFeeder';

export interface NewsFeederResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface NewsFeederStatus {
  autoUpdateOnStartup: boolean;
  updateIntervalHours: number;
  enableScheduledUpdates: boolean;
  hasScheduledUpdates: boolean;
  lastUpdate: string;
}

Meteor.methods({
  // Manual update trigger
  async 'newsFeeder.updateFeeds'(): Promise<NewsFeederResult> {
    // Only allow logged in users to manually update feeds
    if (!this.userId) {
      throw new Meteor.Error('unauthorized', 'You must be logged in to update feeds');
    }

    try {
      const result = await newsFeederService.manualUpdate();
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Error updating feeds: ${error}`
      };
    }
  },

  // Get current status
  'newsFeeder.getStatus'(): NewsFeederStatus {
    try {
      const config = newsFeederService['config'];
      const hasScheduledUpdates = !!newsFeederService['updateInterval'];
      
      return {
        autoUpdateOnStartup: config.autoUpdateOnStartup,
        updateIntervalHours: config.updateIntervalHours,
        enableScheduledUpdates: config.enableScheduledUpdates,
        hasScheduledUpdates,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      throw new Meteor.Error('error', `Error getting status: ${error}`);
    }
  },

  // Check if feeds exist
  'newsFeeder.checkFeeds'(): { [key: string]: boolean } {
    const fs = require('fs');
    const path = require('path');
    
    const publicPath = path.join(process.cwd(), 'public');
    const feeds = ['releases.xml', 'issues.xml', 'discussions.xml', 'retrospectives.xml', 'pullrequests.xml'];
    
    const result: { [key: string]: boolean } = {};
    
    feeds.forEach(feed => {
      const feedPath = path.join(publicPath, feed);
      result[feed] = fs.existsSync(feedPath);
    });
    
    return result;
  },

  // Get feed statistics
  'newsFeeder.getFeedStats'(): { [key: string]: any } {
    const fs = require('fs');
    const path = require('path');
    
    const publicPath = path.join(process.cwd(), 'public');
    const feeds = ['releases.xml', 'issues.xml', 'discussions.xml', 'retrospectives.xml', 'pullrequests.xml'];
    
    const result: { [key: string]: any } = {};
    
    feeds.forEach(feed => {
      const feedPath = path.join(publicPath, feed);
      
      if (fs.existsSync(feedPath)) {
        const stats = fs.statSync(feedPath);
        const content = fs.readFileSync(feedPath, 'utf8');
        const itemCount = (content.match(/<item>/g) || []).length;
        
        result[feed] = {
          exists: true,
          size: stats.size,
          lastModified: stats.mtime,
          itemCount
        };
      } else {
        result[feed] = {
          exists: false,
          size: 0,
          itemCount: 0
        };
      }
    });
    
    return result;
  }
});
