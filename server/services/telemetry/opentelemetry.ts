/**
 * OpenTelemetry integration for SynthralOS
 * 
 * This module sets up OpenTelemetry to send trace and metrics data to SignOz
 * for comprehensive monitoring and troubleshooting.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// For debug purposes, don't use in production
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

/**
 * Initialize OpenTelemetry with SignOz Integration
 * 
 * @param serviceName The name of the service
 * @param serviceVersion The version of the service
 * @param signozEndpoint The SignOz OTLP endpoint (default: http://localhost:4318)
 */
export function initOpenTelemetry(
  serviceName: string = 'synthralos',
  serviceVersion: string = '1.0.0',
  signozEndpoint: string = process.env.SIGNOZ_ENDPOINT || 'http://localhost:4318'
): NodeSDK {
  const traceExporter = new OTLPTraceExporter({
    url: `${signozEndpoint}/v1/traces`,
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${signozEndpoint}/v1/metrics`,
  });

  // Create a resource attributes object
  const resourceAttributes: Record<string, string> = {};
  resourceAttributes[SemanticResourceAttributes.SERVICE_NAME] = serviceName;
  resourceAttributes[SemanticResourceAttributes.SERVICE_VERSION] = serviceVersion;
  resourceAttributes['environment'] = process.env.NODE_ENV || 'development';
  
  const sdk = new NodeSDK({
    traceExporter,
    // Use resources object instead of Resource constructor
    resources: resourceAttributes,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Enable all auto-instrumentations with default settings
        '@opentelemetry/instrumentation-fs': { enabled: true },
        '@opentelemetry/instrumentation-net': { enabled: true },
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  // Register shutdown hook
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

/**
 * Enhances an error to include additional context for better telemetry
 */
export function enhanceErrorForTelemetry(
  error: Error, 
  context: Record<string, any> = {}
): Error {
  const enhancedError = error as any;
  enhancedError.telemetryContext = {
    timestamp: new Date().toISOString(),
    ...context,
  };
  return enhancedError;
}

/**
 * Create a singleton SDK instance
 */
let sdkInstance: NodeSDK | null = null;

export function getOpenTelemetrySdk(): NodeSDK | null {
  return sdkInstance;
}

export function initializeGlobalTelemetry(): NodeSDK {
  if (!sdkInstance) {
    sdkInstance = initOpenTelemetry();
  }
  return sdkInstance;
}