import { WebClient, ChatPostMessageArguments } from '@slack/web-api';

/**
 * SlackService provides functionality to interact with Slack's API
 * for sending messages, reading channels, and monitoring activity.
 */
export class SlackService {
  private client: WebClient;
  private isInitialized: boolean = false;
  private channelId: string | undefined;

  constructor() {
    // Initialize with empty client - we'll validate it when actually used
    this.client = new WebClient();
  }

  /**
   * Initialize the Slack client with API token
   * @param token Slack Bot Token (xoxb-...)
   * @param channelId Default channel ID to post messages to
   * @returns True if initialized successfully
   */
  initialize(token: string, channelId?: string): boolean {
    try {
      this.client = new WebClient(token);
      this.channelId = channelId;
      this.isInitialized = true;
      console.info('Slack service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Slack service', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if the service is properly initialized
   * @returns True if initialized with valid token
   */
  async isConnected(): Promise<boolean> {
    if (!this.isInitialized) return false;
    
    try {
      // Test authentication with auth.test endpoint
      const auth = await this.client.auth.test();
      return !!auth.ok;
    } catch (error) {
      console.error('Slack connection test failed', error);
      return false;
    }
  }

  /**
   * Send a simple text message to a Slack channel
   * @param text Message text
   * @param channel Channel ID (optional, uses default if not provided)
   * @returns Message timestamp if successful
   */
  async sendMessage(text: string, channel?: string): Promise<string | undefined> {
    if (!this.isInitialized) {
      throw new Error('Slack service not initialized');
    }

    const targetChannel = channel || this.channelId;
    if (!targetChannel) {
      throw new Error('No target channel specified for Slack message');
    }

    try {
      const result = await this.client.chat.postMessage({
        channel: targetChannel,
        text
      });
      
      console.debug(`Sent message to Slack channel: ${targetChannel}`);
      return result.ts;
    } catch (error) {
      console.error('Failed to send Slack message', error);
      throw new Error(`Failed to send Slack message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send a rich/structured message to Slack using blocks
   * @param message Full message configuration including blocks
   * @returns Message timestamp if successful
   */
  async sendRichMessage(message: ChatPostMessageArguments): Promise<string | undefined> {
    if (!this.isInitialized) {
      throw new Error('Slack service not initialized');
    }

    // Apply default channel if not provided
    if (!message.channel && this.channelId) {
      message.channel = this.channelId;
    }

    if (!message.channel) {
      throw new Error('No target channel specified for Slack message');
    }

    try {
      const result = await this.client.chat.postMessage(message);
      console.debug(`Sent rich message to Slack channel: ${message.channel}`);
      return result.ts;
    } catch (error) {
      console.error('Failed to send rich Slack message', error);
      throw new Error(`Failed to send rich Slack message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get messages from a channel
   * @param channel Channel ID to fetch history from
   * @param limit Maximum number of messages to retrieve (default: 100)
   * @returns Channel history response
   */
  async getChannelHistory(channel?: string, limit: number = 100) {
    if (!this.isInitialized) {
      throw new Error('Slack service not initialized');
    }

    const targetChannel = channel || this.channelId;
    if (!targetChannel) {
      throw new Error('No target channel specified for fetching Slack history');
    }

    try {
      const result = await this.client.conversations.history({
        channel: targetChannel,
        limit
      });
      console.debug(`Retrieved ${result.messages?.length || 0} messages from Slack channel: ${targetChannel}`);
      return result;
    } catch (error) {
      console.error('Failed to fetch Slack channel history', error);
      throw new Error(`Failed to fetch Slack channel history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get list of channels the bot has access to
   * @returns List of channels
   */
  async listChannels() {
    if (!this.isInitialized) {
      throw new Error('Slack service not initialized');
    }

    try {
      const result = await this.client.conversations.list();
      console.debug(`Retrieved ${result.channels?.length || 0} Slack channels`);
      return result;
    } catch (error) {
      console.error('Failed to list Slack channels', error);
      throw new Error(`Failed to list Slack channels: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get information about a specific channel
   * @param channelId Channel ID to get info for
   * @returns Channel info
   */
  async getChannelInfo(channelId: string) {
    if (!this.isInitialized) {
      throw new Error('Slack service not initialized');
    }

    try {
      const result = await this.client.conversations.info({
        channel: channelId
      });
      return result;
    } catch (error) {
      console.error(`Failed to get info for Slack channel: ${channelId}`, error);
      throw new Error(`Failed to get Slack channel info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Post a file to a Slack channel
   * @param channel Channel to upload file to
   * @param options Upload options
   * @returns Upload response
   */
  async uploadFile(
    channel: string,
    options: {
      file?: string | Buffer;  // Path to file, URL, or Buffer
      content?: string;        // String content to upload
      filename?: string;
      filetype?: string;
      initial_comment?: string;
      title?: string;
    }
  ) {
    if (!this.isInitialized) {
      throw new Error('Slack service not initialized');
    }

    try {
      // Slack API parameters
      const uploadParams = {
        channels: channel,
        ...options
      };
      
      const result = await this.client.files.upload(uploadParams);
      console.debug(`Uploaded file to Slack channel: ${channel}`);
      return result;
    } catch (error) {
      console.error('Failed to upload file to Slack', error);
      throw new Error(`Failed to upload file to Slack: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Singleton instance for the application
export const slackService = new SlackService();