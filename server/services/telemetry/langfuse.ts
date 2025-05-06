/**
 * Langfuse integration for SynthralOS
 * 
 * This module provides LLM observability and monitoring capabilities
 * using Langfuse.
 */

import { Langfuse } from 'langfuse';

/**
 * Langfuse client options
 */
export interface LangfuseOptions {
  secretKey: string;
  publicKey: string;
  baseUrl?: string;
}

/**
 * Initialize Langfuse client
 */
export function initLangfuse(options: LangfuseOptions): Langfuse {
  const { secretKey, publicKey, baseUrl } = options;
  
  return new Langfuse({
    secretKey,
    publicKey,
    baseUrl: baseUrl || 'https://cloud.langfuse.com',
  });
}

/**
 * Singleton Langfuse instance
 */
let langfuseInstance: Langfuse | null = null;

/**
 * Get or create the Langfuse client instance
 */
export function getLangfuseClient(): Langfuse | null {
  if (!langfuseInstance && process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY) {
    langfuseInstance = initLangfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    });
  }
  return langfuseInstance;
}

/**
 * Track a trace in Langfuse
 * 
 * @param name The name of the trace
 * @param userId Optional user ID
 * @param metadata Additional metadata for the trace
 */
export function createTrace(
  name: string,
  userId?: string | number,
  metadata: Record<string, any> = {}
) {
  const client = getLangfuseClient();
  if (!client) {
    console.warn('Langfuse client not initialized. Trace not created:', name);
    return null;
  }

  const userIdString = userId ? userId.toString() : undefined;
  
  return client.trace({
    name,
    userId: userIdString,
    metadata,
  });
}

/**
 * Track a generation in Langfuse
 * 
 * @param traceId The trace ID to associate with this generation
 * @param name The name of the generation
 * @param model The model used
 * @param prompt The prompt or input
 * @param completion The completion or output
 * @param metadata Additional metadata
 */
export function trackGeneration(
  traceId: string | null,
  name: string,
  model: string,
  prompt: string | object,
  completion: string | object,
  metadata: Record<string, any> = {}
) {
  const client = getLangfuseClient();
  if (!client) {
    console.warn('Langfuse client not initialized. Generation not tracked:', name);
    return;
  }

  const promptString = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
  const completionString = typeof completion === 'string' ? completion : JSON.stringify(completion);

  return client.generation({
    name,
    traceId,
    model,
    prompt: promptString,
    completion: completionString,
    metadata,
  });
}

/**
 * Track an event in Langfuse
 * 
 * @param traceId The trace ID to associate with this event
 * @param name The name of the event
 * @param metadata Additional metadata
 */
export function trackEvent(
  traceId: string | null,
  name: string,
  metadata: Record<string, any> = {}
) {
  const client = getLangfuseClient();
  if (!client) {
    console.warn('Langfuse client not initialized. Event not tracked:', name);
    return;
  }

  return client.event({
    name,
    traceId,
    metadata,
  });
}

/**
 * Track an LLM call span in Langfuse
 * 
 * @param traceId The trace ID to associate with this span
 * @param name The name of the span
 * @param metadata Additional metadata
 */
export function trackSpan(
  traceId: string | null,
  name: string,
  metadata: Record<string, any> = {}
) {
  const client = getLangfuseClient();
  if (!client) {
    console.warn('Langfuse client not initialized. Span not tracked:', name);
    return null;
  }

  return client.span({
    name,
    traceId,
    metadata,
  });
}

/**
 * Score a trace, generation, span, or event in Langfuse
 * 
 * @param id The ID of the item to score
 * @param name The name of the score
 * @param value The score value
 * @param comment Optional comment
 */
export function scoreItem(
  id: string,
  name: string,
  value: number,
  comment?: string
) {
  const client = getLangfuseClient();
  if (!client) {
    console.warn('Langfuse client not initialized. Score not tracked:', name);
    return;
  }

  return client.score({
    traceId: id,
    name,
    value,
    comment,
  });
}

/**
 * Flush all queued events to Langfuse
 */
export async function flushLangfuse(): Promise<void> {
  if (langfuseInstance) {
    await langfuseInstance.flush();
  }
}

/**
 * Shutdown the Langfuse client
 */
export async function shutdownLangfuse(): Promise<void> {
  if (langfuseInstance) {
    await langfuseInstance.flush();
    langfuseInstance = null;
  }
}