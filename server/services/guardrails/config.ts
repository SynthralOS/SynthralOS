/**
 * Guardrails Configuration
 * 
 * This module defines the configuration for the guardrails service.
 * It contains different presets for various user roles.
 */

export type GuardrailAction = 'block' | 'modify' | 'allow';

export interface GuardrailsConfig {
  // General settings
  enabled: boolean;
  
  // Content moderation settings
  enableToxicityDetection: boolean;
  toxicityThreshold: number;
  toxicityAction: GuardrailAction;
  
  // PII detection settings
  enablePiiDetection: boolean;
  piiAction: GuardrailAction;
  
  // Security settings
  enableJailbreakDetection: boolean;
  jailbreakAction: GuardrailAction;
  
  // Hallucination detection settings
  enableHallucinationDetection: boolean;
  hallucinationAction: GuardrailAction;
  
  // Copyright/plagiarism detection settings
  enableCopyrightDetection: boolean;
  copyrightAction: GuardrailAction;
  
  // Custom category settings
  customCategories: Array<{
    name: string;
    enabled: boolean;
    action: GuardrailAction;
    patterns?: RegExp[];
  }>;
  
  // Logging and telemetry
  enableLogging: boolean;
  enableTelemetry: boolean;
}

// Default configuration
const defaultConfig: GuardrailsConfig = {
  enabled: true,
  
  enableToxicityDetection: true,
  toxicityThreshold: 0.7,
  toxicityAction: 'modify',
  
  enablePiiDetection: true,
  piiAction: 'modify',
  
  enableJailbreakDetection: true,
  jailbreakAction: 'block',
  
  enableHallucinationDetection: false,
  hallucinationAction: 'modify',
  
  enableCopyrightDetection: false,
  copyrightAction: 'modify',
  
  customCategories: [],
  
  enableLogging: true,
  enableTelemetry: true
};

// Admin configuration (lowest restrictions)
const adminConfig: GuardrailsConfig = {
  ...defaultConfig,
  enableJailbreakDetection: false,
  toxicityAction: 'allow'
};

// Developer configuration (moderate restrictions)
const developerConfig: GuardrailsConfig = {
  ...defaultConfig,
  jailbreakAction: 'modify'
};

// Enterprise configuration (highest restrictions)
const enterpriseConfig: GuardrailsConfig = {
  ...defaultConfig,
  toxicityAction: 'block',
  enableHallucinationDetection: true,
  enableCopyrightDetection: true,
  customCategories: [
    {
      name: 'enterprise-policy',
      enabled: true,
      action: 'block',
      patterns: [
        /confidential|secret|internal only/i,
      ]
    }
  ]
};

// Configuration mapping by role
const configByRole: Record<string, GuardrailsConfig> = {
  default: defaultConfig,
  admin: adminConfig,
  developer: developerConfig,
  enterprise: enterpriseConfig
};

/**
 * Get the guardrails configuration for a specific user role
 */
export function getGuardrailsConfig(role: string): GuardrailsConfig {
  return configByRole[role] || defaultConfig;
}

/**
 * Register a custom guardrails configuration for a role
 */
export function registerGuardrailsConfig(role: string, config: Partial<GuardrailsConfig>): void {
  configByRole[role] = {
    ...defaultConfig,
    ...config
  };
}

/**
 * Update the default guardrails configuration
 */
export function updateDefaultGuardrailsConfig(config: Partial<GuardrailsConfig>): void {
  Object.assign(defaultConfig, config);
}