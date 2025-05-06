/**
 * GuardrailsAI Integration
 * 
 * This module integrates with the GuardrailsAI library for prompt validation
 * and security checks. In development mode, it provides a mock implementation.
 */

export interface SecurityConfig {
  template?: string;
  parameters?: Record<string, unknown>;
  allowedModels?: string[];
  blockedTopics?: string[];
  safetyFilters?: {
    profanity?: boolean;
    sensitiveData?: boolean;
    harmfulContent?: boolean;
  };
}

export interface SecurityResult {
  valid: boolean;
  errors: string[];
  securityFlags?: {
    containsSensitiveData?: boolean;
    containsHarmfulContent?: boolean;
    containsProfanity?: boolean;
    blocklistedTopics?: string[];
  };
  redactedContent?: string;
}

/**
 * Mock implementation of GuardrailsAI
 * 
 * This is used in development mode to simulate the GuardrailsAI functionality.
 */
export class GuardrailsAI {
  /**
   * Validate a prompt against security rules
   * 
   * @param prompt The prompt to validate
   * @param config Security configuration
   * @returns Validation result
   */
  static validatePrompt(prompt: string, config: SecurityConfig): SecurityResult {
    console.log('Mocking GuardrailsAI prompt validation:', { 
      prompt: prompt.substring(0, 50) + '...',
      config 
    });
    
    const result: SecurityResult = {
      valid: true,
      errors: [],
      securityFlags: {
        containsSensitiveData: false,
        containsHarmfulContent: false,
        containsProfanity: false,
        blocklistedTopics: []
      }
    };
    
    // Simple profanity check
    if (config.safetyFilters?.profanity) {
      const profanityList = ['badword1', 'badword2', 'badword3', 'offensive'];
      for (const word of profanityList) {
        if (prompt.toLowerCase().includes(word)) {
          result.valid = false;
          result.errors.push(`Prompt contains profanity: "${word}"`);
          result.securityFlags!.containsProfanity = true;
          break;
        }
      }
    }
    
    // Simple sensitive data check
    if (config.safetyFilters?.sensitiveData) {
      const sensitivePatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/,  // SSN
        /\b\d{16}\b/,             // Credit card number
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i  // Email
      ];
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(prompt)) {
          result.valid = false;
          result.errors.push('Prompt contains sensitive personal information');
          result.securityFlags!.containsSensitiveData = true;
          result.redactedContent = prompt.replace(pattern, '[REDACTED]');
          break;
        }
      }
    }
    
    // Blocked topics check
    if (config.blockedTopics && config.blockedTopics.length > 0) {
      for (const topic of config.blockedTopics) {
        if (prompt.toLowerCase().includes(topic.toLowerCase())) {
          result.valid = false;
          result.errors.push(`Prompt contains blocked topic: "${topic}"`);
          result.securityFlags!.blocklistedTopics = [
            ...(result.securityFlags!.blocklistedTopics || []),
            topic
          ];
        }
      }
    }
    
    return result;
  }
  
  /**
   * Validate a model response against security rules
   * 
   * @param response The response to validate
   * @param config Security configuration
   * @returns Validation result
   */
  static validateResponse(response: string, config: SecurityConfig): SecurityResult {
    console.log('Mocking GuardrailsAI response validation:', {
      response: response.substring(0, 50) + '...',
      config
    });
    
    // Use the same logic as prompt validation for mock purposes
    return this.validatePrompt(response, config);
  }
}