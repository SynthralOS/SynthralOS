/**
 * CommonJS wrapper for PostHog
 * 
 * This module allows PostHog to be used in both ESM and CommonJS environments.
 */

// Load PostHog using conditional require to handle both ESM and CommonJS
let PostHogClient;
try {
  // Try to load via dynamic import
  PostHogClient = require('posthog-node');
  if (PostHogClient.default) {
    PostHogClient = PostHogClient.default;
  }
} catch (e) {
  console.warn('Could not load PostHog client:', e);
  // Create a stub implementation
  PostHogClient = class PostHogStub {
    constructor() {}
    capture() {}
    identify() {}
    groupIdentify() {}
    isFeatureEnabled() { return false; }
    getAllFlags() { return {}; }
    shutdown() { return Promise.resolve(); }
  };
}

// Export the PostHog client or stub
module.exports = {
  PostHogClient,
  
  initPostHog: function(options) {
    const { apiKey, host, flushAt, flushInterval } = options;
    
    try {
      return new PostHogClient(apiKey, {
        host: host || 'https://app.posthog.com',
        flushAt: flushAt || 20, 
        flushInterval: flushInterval || 10000,
      });
    } catch (e) {
      console.warn('Error initializing PostHog:', e);
      return new PostHogClient();
    }
  }
};