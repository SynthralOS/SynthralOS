/**
 * Telemetry routes for SynthralOS
 * 
 * This module provides API endpoints for telemetry configuration and monitoring.
 */

import { Router } from 'express';
import { getOpenTelemetrySdk, initializeGlobalTelemetry } from '../services/telemetry/opentelemetry';
import { getPostHogClient, trackEvent, isFeatureEnabled, getAllFeatureFlags } from '../services/telemetry/posthog';
import { getLangfuseClient, createTrace, trackGeneration } from '../services/telemetry/langfuse';
import { getStackStormClient, IncidentResponseActions } from '../services/telemetry/stackstorm';
import { archGWService } from '../services/telemetry/arch_gw';

export const telemetryRouter = Router();

/**
 * Get telemetry status (which services are active)
 */
telemetryRouter.get('/status', (req, res) => {
  const status = {
    openTelemetry: getOpenTelemetrySdk() !== null,
    postHog: getPostHogClient() !== null,
    langfuse: getLangfuseClient() !== null,
    stackStorm: getStackStormClient() !== null,
    archGW: true, // Always available as it's a local service
  };

  res.json({
    enabled: Object.values(status).some(Boolean),
    services: status
  });
});

/**
 * Initialize OpenTelemetry
 */
telemetryRouter.post('/opentelemetry/init', (req, res) => {
  try {
    const sdk = initializeGlobalTelemetry();
    res.json({ success: true, message: 'OpenTelemetry initialized successfully' });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize OpenTelemetry',
      error: error.message
    });
  }
});

/**
 * Track an event in PostHog
 */
telemetryRouter.post('/track-event', (req, res) => {
  try {
    const { eventName, userId, properties } = req.body;
    
    if (!eventName || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event name and user ID are required' 
      });
    }

    trackEvent(eventName, userId, properties);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to track event',
      error: error.message
    });
  }
});

/**
 * Check if a feature flag is enabled
 */
telemetryRouter.get('/feature-flag/:flagKey/:userId', async (req, res) => {
  try {
    const { flagKey, userId } = req.params;
    const defaultValue = req.query.default === 'true';
    
    const enabled = await isFeatureEnabled(flagKey, userId, defaultValue);
    res.json({ enabled });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check feature flag',
      error: error.message
    });
  }
});

/**
 * Get all feature flags for a user
 */
telemetryRouter.get('/feature-flags/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const flags = await getAllFeatureFlags(userId);
    res.json({ flags });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get feature flags',
      error: error.message
    });
  }
});

/**
 * Create a new trace in Langfuse
 */
telemetryRouter.post('/langfuse/trace', async (req, res) => {
  try {
    const { name, userId, metadata } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trace name is required' 
      });
    }

    const trace = createTrace(name, userId, metadata);
    res.json({ success: true, traceId: trace?.id });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create trace',
      error: error.message
    });
  }
});

/**
 * Track an LLM generation in Langfuse
 */
telemetryRouter.post('/langfuse/generation', async (req, res) => {
  try {
    const { traceId, name, model, prompt, completion, metadata } = req.body;
    
    if (!name || !model || !prompt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, model, and prompt are required' 
      });
    }

    const generation = trackGeneration(traceId, name, model, prompt, completion || '', metadata);
    res.json({ success: true, generationId: generation?.id });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to track generation',
      error: error.message
    });
  }
});

/**
 * Report a security incident in StackStorm
 */
telemetryRouter.post('/stackstorm/security-incident', async (req, res) => {
  try {
    const { severity, description, metadata } = req.body;
    
    if (!severity || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Severity and description are required' 
      });
    }

    const result = await IncidentResponseActions.reportSecurityIncident(
      severity, 
      description, 
      metadata
    );
    
    res.json({ 
      success: true, 
      executionId: result?.id,
      status: result?.status
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to report security incident',
      error: error.message
    });
  }
});

/**
 * Get all architecture components
 */
telemetryRouter.get('/arch/components', (req, res) => {
  const components = archGWService.getComponents();
  res.json({ components });
});

/**
 * Register a new architecture component
 */
telemetryRouter.post('/arch/components', (req, res) => {
  try {
    const component = req.body;
    
    if (!component.id || !component.name || !component.type) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID, name, and type are required' 
      });
    }

    const registeredComponent = archGWService.registerComponent(component);
    res.json({ success: true, component: registeredComponent });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to register component',
      error: error.message
    });
  }
});

/**
 * Get all architecture rules
 */
telemetryRouter.get('/arch/rules', (req, res) => {
  const rules = archGWService.getRules();
  res.json({ rules });
});

/**
 * Add a new architecture rule
 */
telemetryRouter.post('/arch/rules', (req, res) => {
  try {
    const rule = req.body;
    
    if (!rule.id || !rule.name || !rule.type || !rule.condition) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID, name, type, and condition are required' 
      });
    }

    const addedRule = archGWService.addRule(rule);
    res.json({ success: true, rule: addedRule });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add rule',
      error: error.message
    });
  }
});

/**
 * Validate the architecture
 */
telemetryRouter.post('/arch/validate', (req, res) => {
  try {
    const result = archGWService.validateArchitecture();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to validate architecture',
      error: error.message
    });
  }
});