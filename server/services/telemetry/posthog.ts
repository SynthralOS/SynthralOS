/**
 * PostHog integration for SynthralOS
 * 
 * This module provides analytics tracking and feature flag capabilities
 * using PostHog.
 */

// Import from the CJS wrapper to avoid ESM loading issues
// @ts-ignore - Dynamic import of the CJS file
import { PostHogClient, initPostHog as initPostHogFromWrapper } from './posthog-wrapper.cjs';

/**
 * PostHog client options
 */
export interface PostHogOptions {
  apiKey: string;
  host?: string;
  flushAt?: number;
  flushInterval?: number;
}

/**
 * Initialize PostHog client
 */
export function initPostHog(options: PostHogOptions): any {
  return initPostHogFromWrapper(options);
}

/**
 * Singleton PostHog instance
 */
let posthogInstance: any | null = null;

/**
 * Get or create the PostHog client instance
 */
export function getPostHogClient(): typeof PostHogClient | null {
  if (!posthogInstance && process.env.POSTHOG_API_KEY) {
    posthogInstance = initPostHog({
      apiKey: process.env.POSTHOG_API_KEY,
      host: process.env.POSTHOG_HOST,
    });
  }
  return posthogInstance;
}

/**
 * Track an event in PostHog
 * 
 * @param eventName The name of the event
 * @param userId The user ID
 * @param properties Additional properties for the event
 */
export function trackEvent(
  eventName: string,
  userId: string | number,
  properties: Record<string, any> = {}
): void {
  const client = getPostHogClient();
  if (!client) {
    console.warn('PostHog client not initialized. Event not tracked:', eventName);
    return;
  }

  client.capture({
    distinctId: userId.toString(),
    event: eventName,
    properties,
  });
}

/**
 * Check if a feature flag is enabled for a user
 * 
 * @param flagKey The feature flag key
 * @param userId The user ID
 * @param defaultValue The default value if the flag is not defined
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId: string | number,
  defaultValue: boolean = false
): Promise<boolean> {
  const client = getPostHogClient();
  if (!client) {
    console.warn('PostHog client not initialized. Using default for feature flag:', flagKey);
    return defaultValue;
  }

  try {
    const result = await client.isFeatureEnabled(flagKey, userId.toString());
    return result !== null ? result : defaultValue;
  } catch (error) {
    console.error(`Error checking feature flag ${flagKey}:`, error);
    return defaultValue;
  }
}

/**
 * Get all feature flags for a user
 * 
 * @param userId The user ID
 */
export async function getAllFeatureFlags(
  userId: string | number
): Promise<Record<string, boolean | string | number>> {
  const client = getPostHogClient();
  if (!client) {
    console.warn('PostHog client not initialized. Cannot get feature flags.');
    return {};
  }

  try {
    const flags = await client.getAllFlags(userId.toString());
    return flags || {};
  } catch (error) {
    console.error('Error getting all feature flags:', error);
    return {};
  }
}

/**
 * Identify a user in PostHog
 * 
 * @param userId The user ID
 * @param properties User properties to set
 */
export function identifyUser(
  userId: string | number,
  properties: Record<string, any> = {}
): void {
  const client = getPostHogClient();
  if (!client) {
    console.warn('PostHog client not initialized. User identification skipped.');
    return;
  }

  client.identify({
    distinctId: userId.toString(),
    properties,
  });
}

/**
 * Group users in PostHog
 * 
 * @param groupType The type of group
 * @param groupKey The group identifier
 * @param properties Group properties to set
 */
export function groupUsers(
  groupType: string,
  groupKey: string,
  properties: Record<string, any> = {}
): void {
  const client = getPostHogClient();
  if (!client) {
    console.warn('PostHog client not initialized. Group update skipped.');
    return;
  }

  client.groupIdentify({
    groupType,
    groupKey,
    properties,
  });
}

/**
 * Shutdown the PostHog client (useful for graceful shutdowns)
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogInstance) {
    await posthogInstance.shutdown();
    posthogInstance = null;
  }
}