import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface NewsFeederConfig {
  autoUpdateOnStartup: boolean;
  updateIntervalHours: number;
  enableScheduledUpdates: boolean;
}

class NewsFeederService {
  private config: NewsFeederConfig;
  private updateInterval?: NodeJS.Timeout;

  constructor(config: NewsFeederConfig = {
    autoUpdateOnStartup: true,
    updateIntervalHours: 6,
    enableScheduledUpdates: false // Disabled scheduled updates
  }) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Update feeds on startup if configured
    if (this.config.autoUpdateOnStartup) {
      await this.updateFeeds();
    }

    // Set up scheduled updates if configured
    if (this.config.enableScheduledUpdates) {
      this.scheduleUpdates();
    }
  }

  private scheduleUpdates(): void {
    const intervalMs = this.config.updateIntervalHours * 60 * 60 * 1000;
    
    this.updateInterval = setInterval(async () => {
      await this.updateFeeds();
    }, intervalMs);
  }

  async updateFeeds(): Promise<{ success: boolean; message: string }> {
    try {
      // Execute the script directly from the project root
      // Use a more dynamic approach to find the project root
      const projectRoot = process.env.PWD || process.cwd();
      const { stderr } = await execAsync('node scripts/update-nodejs-feeds.js', {
        cwd: projectRoot,
        timeout: 30000 // 30 seconds timeout
      });

      // Check for actual errors (ignore npm warnings)
      if (stderr && !stderr.includes('npm WARN') && !stderr.includes('MODULE_TYPELESS_PACKAGE_JSON')) {
        return { success: false, message: `Update failed: ${stderr}` };
      }
      
      return { success: true, message: 'Feeds updated successfully' };
    } catch (error) {
      return { success: false, message: `Error updating feeds: ${error}` };
    }
  }

  // Method to manually trigger feed update (can be called from Meteor methods)
  async manualUpdate(): Promise<{ success: boolean; message: string }> {
    return await this.updateFeeds();
  }

  stopScheduledUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }
}

// Export singleton instance
export const newsFeederService = new NewsFeederService();
