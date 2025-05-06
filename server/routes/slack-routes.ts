import express, { Request, Response, NextFunction } from 'express';
import { slackService } from '../services/integrations/slack';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertSlackConfigSchema, 
  insertSlackWebhookSchema, 
  SlackConnectionStatus 
} from '@shared/schema';

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

const router = express.Router();

// Ensure all routes require authentication
router.use(isAuthenticated);

// Get Slack configuration for the current user
router.get('/config', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const config = await storage.getSlackConfig(userId);
    
    if (!config) {
      return res.status(404).json({ message: "No Slack configuration found" });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error getting Slack config:', error);
    res.status(500).json({ message: 'Failed to get Slack configuration' });
  }
});

// Create or update Slack configuration
router.post('/config', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    // Validate request body
    const configData = insertSlackConfigSchema.parse({
      ...req.body,
      userId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create the config
    const config = await storage.createSlackConfig(configData);
    
    // Test the connection
    const connectionSuccess = slackService.initialize(config.botToken, config.defaultChannelId);
    if (!connectionSuccess) {
      // If connection fails, update the config status
      await storage.updateSlackConfig(config.id, {
        connectionStatus: SlackConnectionStatus.Error,
        lastConnectionError: 'Failed to connect to Slack API',
        updatedAt: new Date()
      });
      return res.status(400).json({ message: 'Failed to connect to Slack API with provided credentials' });
    }
    
    // Update config with successful connection status
    await storage.updateSlackConfig(config.id, {
      connectionStatus: SlackConnectionStatus.Connected,
      lastConnectionError: null,
      lastConnectedAt: new Date(),
      updatedAt: new Date()
    });
    
    res.status(201).json(config);
  } catch (error) {
    console.error('Error creating Slack config:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create Slack configuration' });
  }
});

// Update Slack configuration
router.patch('/config/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const configId = parseInt(req.params.id);
    
    // Get existing config
    const existingConfig = await storage.getSlackConfigById(configId);
    if (!existingConfig) {
      return res.status(404).json({ message: 'Slack configuration not found' });
    }
    
    // Verify ownership
    if (existingConfig.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this configuration' });
    }
    
    // Update the config
    const updatedConfig = await storage.updateSlackConfig(configId, {
      ...req.body,
      updatedAt: new Date()
    });
    
    // If token was updated, test the connection
    if (req.body.botToken) {
      const connectionSuccess = slackService.initialize(
        req.body.botToken, 
        req.body.defaultChannelId || existingConfig.defaultChannelId
      );
      
      if (!connectionSuccess) {
        // If connection fails, update the config status
        await storage.updateSlackConfig(configId, {
          connectionStatus: SlackConnectionStatus.Error,
          lastConnectionError: 'Failed to connect to Slack API',
          updatedAt: new Date()
        });
        return res.status(400).json({ message: 'Failed to connect to Slack API with provided credentials' });
      }
      
      // Update config with successful connection status
      await storage.updateSlackConfig(configId, {
        connectionStatus: SlackConnectionStatus.Connected,
        lastConnectionError: null,
        lastConnectedAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating Slack config:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to update Slack configuration' });
  }
});

// Delete Slack configuration
router.delete('/config/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const configId = parseInt(req.params.id);
    
    // Get existing config
    const existingConfig = await storage.getSlackConfigById(configId);
    if (!existingConfig) {
      return res.status(404).json({ message: 'Slack configuration not found' });
    }
    
    // Verify ownership
    if (existingConfig.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this configuration' });
    }
    
    // Delete the config
    const deleted = await storage.deleteSlackConfig(configId);
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete Slack configuration' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting Slack config:', error);
    res.status(500).json({ message: 'Failed to delete Slack configuration' });
  }
});

// List channels
router.get('/channels', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const configId = req.query.configId ? parseInt(req.query.configId as string) : undefined;
    
    // Get channels from database
    const channels = await storage.getSlackChannels(userId, configId);
    res.json(channels);
  } catch (error) {
    console.error('Error getting Slack channels:', error);
    res.status(500).json({ message: 'Failed to get Slack channels' });
  }
});

// Sync channels from Slack API
router.post('/channels/sync', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { configId } = req.body;
    
    if (!configId) {
      return res.status(400).json({ message: 'configId is required' });
    }
    
    // Get the Slack config
    const config = await storage.getSlackConfigById(parseInt(configId));
    if (!config) {
      return res.status(404).json({ message: 'Slack configuration not found' });
    }
    
    // Verify ownership
    if (config.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to sync channels for this configuration' });
    }
    
    // Initialize Slack client
    const initialized = slackService.initialize(config.botToken, config.defaultChannelId);
    if (!initialized) {
      return res.status(500).json({ message: 'Failed to initialize Slack client' });
    }
    
    // Get channels from Slack API
    const channelsResponse = await slackService.listChannels();
    if (!channelsResponse.ok || !channelsResponse.channels) {
      return res.status(500).json({ message: 'Failed to fetch channels from Slack' });
    }
    
    // Format channels for storage
    const channelsData = channelsResponse.channels.map(channel => ({
      channelId: channel.id as string,
      name: channel.name as string,
      isPrivate: channel.is_private || false
    }));
    
    // Save or update channels
    const savedChannels = await storage.createOrUpdateSlackChannels(
      userId,
      parseInt(configId),
      channelsData
    );
    
    res.json(savedChannels);
  } catch (error) {
    console.error('Error syncing Slack channels:', error);
    res.status(500).json({ message: 'Failed to sync Slack channels' });
  }
});

// Get messages from a channel
router.get('/messages/:channelId', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const slackChannelId = parseInt(req.params.channelId);
    
    // Get limit from query params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    // Parse date filters if provided
    const before = req.query.before ? new Date(req.query.before as string) : undefined;
    const after = req.query.after ? new Date(req.query.after as string) : undefined;
    
    // Get the channel
    const channel = await storage.getSlackChannel(slackChannelId);
    if (!channel) {
      return res.status(404).json({ message: 'Slack channel not found' });
    }
    
    // Verify ownership
    if (channel.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to access messages for this channel' });
    }
    
    // Get messages from database
    const messages = await storage.getSlackMessages(slackChannelId, { limit, before, after });
    res.json(messages);
  } catch (error) {
    console.error('Error getting Slack messages:', error);
    res.status(500).json({ message: 'Failed to get Slack messages' });
  }
});

// Sync messages for a channel
router.post('/messages/sync', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { channelId, configId } = req.body;
    
    if (!channelId || !configId) {
      return res.status(400).json({ message: 'channelId and configId are required' });
    }
    
    // Get the Slack config
    const config = await storage.getSlackConfigById(parseInt(configId));
    if (!config) {
      return res.status(404).json({ message: 'Slack configuration not found' });
    }
    
    // Verify ownership
    if (config.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to sync messages for this configuration' });
    }
    
    // Get the channel
    const channel = await storage.getSlackChannelBySlackId(userId, parseInt(configId), channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Slack channel not found' });
    }
    
    // Initialize Slack client
    const initialized = slackService.initialize(config.botToken, config.defaultChannelId);
    if (!initialized) {
      return res.status(500).json({ message: 'Failed to initialize Slack client' });
    }
    
    // Get messages from Slack API
    const messagesResponse = await slackService.getChannelHistory(channelId, 100);
    if (!messagesResponse.ok || !messagesResponse.messages) {
      return res.status(500).json({ message: 'Failed to fetch messages from Slack' });
    }
    
    // Format messages for storage
    const messagesToStore = messagesResponse.messages.map(message => ({
      channelId: channel.id,
      messageId: message.ts as string,
      userId: message.user as string || 'unknown',
      text: message.text as string || '',
      postedAt: new Date(parseFloat(message.ts as string) * 1000),
      rawData: message,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    // Save messages
    const count = await storage.batchCreateSlackMessages(messagesToStore);
    
    // Update channel's last synced time
    await storage.updateSlackChannel(channel.id, { lastSyncedAt: new Date() });
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error syncing Slack messages:', error);
    res.status(500).json({ message: 'Failed to sync Slack messages' });
  }
});

// Send a message
router.post('/messages/send', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { channelId, text, configId } = req.body;
    
    if (!channelId || !text) {
      return res.status(400).json({ message: 'channelId and text are required' });
    }
    
    // Get the Slack config
    const config = configId 
      ? await storage.getSlackConfigById(parseInt(configId))
      : await storage.getSlackConfig(userId);
      
    if (!config) {
      return res.status(404).json({ message: 'No active Slack configuration found' });
    }
    
    // Verify ownership
    if (config.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to send messages using this configuration' });
    }
    
    // Initialize Slack client
    const initialized = slackService.initialize(config.botToken, config.defaultChannelId);
    if (!initialized) {
      return res.status(500).json({ message: 'Failed to initialize Slack client' });
    }
    
    // Send the message
    const messageTs = await slackService.sendMessage(text, channelId);
    if (!messageTs) {
      return res.status(500).json({ message: 'Failed to send message to Slack' });
    }
    
    // Get or create the channel record
    let channel = await storage.getSlackChannelBySlackId(userId, config.id, channelId);
    
    // If channel doesn't exist in our DB yet, try to get info and create it
    if (!channel) {
      try {
        const channelInfo = await slackService.getChannelInfo(channelId);
        if (channelInfo.ok && channelInfo.channel) {
          channel = await storage.createSlackChannel({
            userId,
            configId: config.id,
            channelId: channelId,
            name: channelInfo.channel.name as string || 'unknown',
            isPrivate: channelInfo.channel.is_private || false,
            lastSyncedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error creating channel record:', error);
        // Continue even if we couldn't create the channel record
      }
    }
    
    // Store the message in database if we have a channel record
    let savedMessage;
    if (channel) {
      savedMessage = await storage.createSlackMessage({
        channelId: channel.id,
        messageId: messageTs,
        userId: 'bot', // This message was sent by our bot
        text,
        postedAt: new Date(),
        rawData: { text, ts: messageTs },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    res.json({ success: true, messageTs, message: savedMessage });
  } catch (error) {
    console.error('Error sending Slack message:', error);
    res.status(500).json({ message: 'Failed to send Slack message' });
  }
});

// Create webhook
router.post('/webhooks', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    // Validate request body
    const webhookData = insertSlackWebhookSchema.parse({
      ...req.body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Get the Slack config
    const config = await storage.getSlackConfigById(webhookData.configId);
    if (!config) {
      return res.status(404).json({ message: 'Slack configuration not found' });
    }
    
    // Verify ownership
    if (config.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to create webhooks for this configuration' });
    }
    
    // Create the webhook
    const webhook = await storage.createSlackWebhook(webhookData);
    res.status(201).json(webhook);
  } catch (error) {
    console.error('Error creating Slack webhook:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create Slack webhook' });
  }
});

// Get webhooks
router.get('/webhooks', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const configId = req.query.configId ? parseInt(req.query.configId as string) : undefined;
    
    // Get webhooks from database
    const webhooks = await storage.getSlackWebhooks(userId, configId);
    res.json(webhooks);
  } catch (error) {
    console.error('Error getting Slack webhooks:', error);
    res.status(500).json({ message: 'Failed to get Slack webhooks' });
  }
});

// Update webhook
router.patch('/webhooks/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const webhookId = parseInt(req.params.id);
    
    // Get existing webhook
    const existingWebhook = await storage.getSlackWebhook(webhookId);
    if (!existingWebhook) {
      return res.status(404).json({ message: 'Slack webhook not found' });
    }
    
    // Verify ownership
    if (existingWebhook.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this webhook' });
    }
    
    // Update the webhook
    const updatedWebhook = await storage.updateSlackWebhook(webhookId, {
      ...req.body,
      updatedAt: new Date()
    });
    
    res.json(updatedWebhook);
  } catch (error) {
    console.error('Error updating Slack webhook:', error);
    res.status(500).json({ message: 'Failed to update Slack webhook' });
  }
});

// Delete webhook
router.delete('/webhooks/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const webhookId = parseInt(req.params.id);
    
    // Get existing webhook
    const existingWebhook = await storage.getSlackWebhook(webhookId);
    if (!existingWebhook) {
      return res.status(404).json({ message: 'Slack webhook not found' });
    }
    
    // Verify ownership
    if (existingWebhook.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this webhook' });
    }
    
    // Delete the webhook
    const deleted = await storage.deleteSlackWebhook(webhookId);
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete Slack webhook' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting Slack webhook:', error);
    res.status(500).json({ message: 'Failed to delete Slack webhook' });
  }
});

// Webhook endpoint - receives events from Slack
router.post('/webhook/:webhookId', async (req, res) => {
  try {
    const webhookId = req.params.webhookId;
    const webhook = await storage.getSlackWebhook(parseInt(webhookId));
    
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    
    // Handle Slack URL verification
    if (req.body.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }
    
    // Process the event
    const event = req.body.event;
    if (!event) {
      return res.status(400).json({ message: 'No event in payload' });
    }
    
    // Store the event or trigger appropriate actions based on webhook configuration
    // TODO: Implement event processing logic

    // For now, just acknowledge receipt
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    res.status(500).json({ message: 'Failed to process webhook event' });
  }
});

export default router;