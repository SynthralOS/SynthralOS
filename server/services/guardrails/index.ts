/**
 * Guardrails Service
 * 
 * Provides AI safety and moderation features for the platform:
 * - Content filtering (toxicity, PII, profanity)
 * - Topic restrictions
 * - Output validation
 * - Jailbreak prevention
 * - Prompt injection detection
 * - Model alignment enforcement
 */

import { logInfo, logWarning, logError } from '../activity-logger';
import { EntityType } from '@shared/schema';
import { EventEmitter } from 'events';

export enum GuardrailLevel {
  STRICT = 'strict',
  MODERATE = 'moderate',
  MINIMAL = 'minimal',
  CUSTOM = 'custom',
  NONE = 'none'
}

export enum ContentCategory {
  TOXICITY = 'toxicity',
  HATE_SPEECH = 'hate_speech',
  SEXUAL_CONTENT = 'sexual_content',
  VIOLENCE = 'violence',
  SELF_HARM = 'self_harm',
  HARASSMENT = 'harassment',
  PROFANITY = 'profanity',
  PII = 'pii',
  PROPRIETARY_INFO = 'proprietary_info',
  DISCRIMINATION = 'discrimination',
  JAILBREAK = 'jailbreak',
  PROMPT_INJECTION = 'prompt_injection'
}

export interface GuardrailConfig {
  level: GuardrailLevel;
  enabledCategories: ContentCategory[];
  thresholds: Record<ContentCategory, number>;
  allowedTopics: string[];
  blockedTopics: string[];
  allowedPatterns: string[];
  blockedPatterns: string[];
  customRules?: Record<string, any>;
}

export interface ContentDetection {
  category: ContentCategory;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  text: string;
  location?: {
    start: number;
    end: number;
  };
}

export interface GuardrailResult {
  allowed: boolean;
  detections: ContentDetection[];
  filteredContent?: string;
  blockReason?: string;
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  processedAt: Date;
}

// Default guardrail configurations
const DEFAULT_GUARDRAIL_CONFIGS: Record<GuardrailLevel, Partial<GuardrailConfig>> = {
  [GuardrailLevel.STRICT]: {
    enabledCategories: Object.values(ContentCategory),
    thresholds: {
      [ContentCategory.TOXICITY]: 0.5,
      [ContentCategory.HATE_SPEECH]: 0.4,
      [ContentCategory.SEXUAL_CONTENT]: 0.6,
      [ContentCategory.VIOLENCE]: 0.6,
      [ContentCategory.SELF_HARM]: 0.3,
      [ContentCategory.HARASSMENT]: 0.5,
      [ContentCategory.PROFANITY]: 0.7,
      [ContentCategory.PII]: 0.5,
      [ContentCategory.PROPRIETARY_INFO]: 0.8,
      [ContentCategory.DISCRIMINATION]: 0.5,
      [ContentCategory.JAILBREAK]: 0.5,
      [ContentCategory.PROMPT_INJECTION]: 0.5
    },
    blockedTopics: [
      'illegal activities',
      'hacking',
      'terrorism',
      'self-harm',
      'adult content'
    ]
  },
  [GuardrailLevel.MODERATE]: {
    enabledCategories: [
      ContentCategory.TOXICITY,
      ContentCategory.HATE_SPEECH,
      ContentCategory.SEXUAL_CONTENT,
      ContentCategory.VIOLENCE,
      ContentCategory.SELF_HARM,
      ContentCategory.JAILBREAK,
      ContentCategory.PROMPT_INJECTION
    ],
    thresholds: {
      [ContentCategory.TOXICITY]: 0.7,
      [ContentCategory.HATE_SPEECH]: 0.6,
      [ContentCategory.SEXUAL_CONTENT]: 0.8,
      [ContentCategory.VIOLENCE]: 0.8,
      [ContentCategory.SELF_HARM]: 0.5,
      [ContentCategory.HARASSMENT]: 0.7,
      [ContentCategory.PROFANITY]: 0.85,
      [ContentCategory.PII]: 0.7,
      [ContentCategory.PROPRIETARY_INFO]: 0.9,
      [ContentCategory.DISCRIMINATION]: 0.7,
      [ContentCategory.JAILBREAK]: 0.7,
      [ContentCategory.PROMPT_INJECTION]: 0.7
    },
    blockedTopics: [
      'illegal activities',
      'terrorism',
      'self-harm'
    ]
  },
  [GuardrailLevel.MINIMAL]: {
    enabledCategories: [
      ContentCategory.HATE_SPEECH,
      ContentCategory.SELF_HARM,
      ContentCategory.JAILBREAK,
      ContentCategory.PROMPT_INJECTION
    ],
    thresholds: {
      [ContentCategory.TOXICITY]: 0.9,
      [ContentCategory.HATE_SPEECH]: 0.8,
      [ContentCategory.SEXUAL_CONTENT]: 0.95,
      [ContentCategory.VIOLENCE]: 0.95,
      [ContentCategory.SELF_HARM]: 0.7,
      [ContentCategory.HARASSMENT]: 0.9,
      [ContentCategory.PROFANITY]: 0.95,
      [ContentCategory.PII]: 0.9,
      [ContentCategory.PROPRIETARY_INFO]: 0.95,
      [ContentCategory.DISCRIMINATION]: 0.9,
      [ContentCategory.JAILBREAK]: 0.8,
      [ContentCategory.PROMPT_INJECTION]: 0.8
    },
    blockedTopics: [
      'terrorism',
      'self-harm'
    ]
  },
  [GuardrailLevel.NONE]: {
    enabledCategories: [],
    thresholds: {} as Record<ContentCategory, number>,
    blockedTopics: []
  },
  [GuardrailLevel.CUSTOM]: {
    // Custom configuration should be provided by the user
  }
};

class GuardrailsService extends EventEmitter {
  private configs: Map<string, GuardrailConfig> = new Map();
  
  constructor() {
    super();
    
    // Initialize with empty configs
  }
  
  /**
   * Set guardrail configuration for a specific workflow
   */
  public setGuardrailConfig(workflowId: string, config: Partial<GuardrailConfig>): GuardrailConfig {
    const existingConfig = this.configs.get(workflowId);
    
    // Start with default config based on level
    const level = config.level || GuardrailLevel.MODERATE;
    const baseConfig = DEFAULT_GUARDRAIL_CONFIGS[level] as Partial<GuardrailConfig>;
    
    // Create merged config
    const newConfig: GuardrailConfig = {
      level,
      enabledCategories: config.enabledCategories || baseConfig.enabledCategories || [],
      thresholds: { ...baseConfig.thresholds, ...config.thresholds } as Record<ContentCategory, number>,
      allowedTopics: config.allowedTopics || baseConfig.allowedTopics || [],
      blockedTopics: config.blockedTopics || baseConfig.blockedTopics || [],
      allowedPatterns: config.allowedPatterns || baseConfig.allowedPatterns || [],
      blockedPatterns: config.blockedPatterns || baseConfig.blockedPatterns || [],
      customRules: config.customRules
    };
    
    // Store the configuration
    this.configs.set(workflowId, newConfig);
    
    logInfo(
      "Set guardrail config",
      { 
        message: `Guardrail configuration set for workflow ${workflowId} with level ${level}`,
        workflowId
      },
      undefined,
      EntityType.Workflow,
      workflowId
    );
    
    return newConfig;
  }
  
  /**
   * Get guardrail configuration for a workflow
   */
  public getGuardrailConfig(workflowId: string): GuardrailConfig | undefined {
    return this.configs.get(workflowId);
  }
  
  /**
   * Apply guardrails to check if content is allowed
   */
  public checkContent(workflowId: string, content: string): GuardrailResult {
    const config = this.configs.get(workflowId);
    
    // If no config or level is NONE, allow all content
    if (!config || config.level === GuardrailLevel.NONE) {
      return {
        allowed: true,
        detections: [],
        risk: 'none',
        processedAt: new Date()
      };
    }
    
    // Perform content analysis (demo implementation)
    const detections = this.analyzeContent(content, config);
    
    // Check if any detections exceed thresholds
    const blockingDetections = detections.filter(detection => {
      const threshold = config.thresholds[detection.category];
      return threshold && detection.confidence >= threshold;
    });
    
    const allowed = blockingDetections.length === 0;
    
    // Determine overall risk level
    let risk: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    
    if (detections.length > 0) {
      const maxConfidence = Math.max(...detections.map(d => d.confidence));
      
      if (maxConfidence > 0.9) {
        risk = 'critical';
      } else if (maxConfidence > 0.7) {
        risk = 'high';
      } else if (maxConfidence > 0.5) {
        risk = 'medium';
      } else if (maxConfidence > 0.3) {
        risk = 'low';
      }
    }
    
    // Create block reason if needed
    let blockReason: string | undefined;
    
    if (!allowed) {
      const categories = blockingDetections.map(d => d.category).join(', ');
      blockReason = `Content blocked due to: ${categories}`;
    }
    
    // Log the result
    if (!allowed) {
      logWarning(
        "Guardrail blocked content",
        { 
          message: blockReason,
          workflowId,
          categories: blockingDetections.map(d => d.category),
          risk
        },
        undefined,
        EntityType.Workflow,
        workflowId
      );
      
      // Emit block event
      this.emit('content-blocked', {
        workflowId,
        detections: blockingDetections,
        content,
        timestamp: new Date()
      });
    }
    
    return {
      allowed,
      detections,
      blockReason,
      risk,
      processedAt: new Date()
    };
  }
  
  /**
   * Filter and sanitize content based on guardrails
   */
  public filterContent(workflowId: string, content: string): GuardrailResult {
    const config = this.configs.get(workflowId);
    
    // If no config or level is NONE, return original content
    if (!config || config.level === GuardrailLevel.NONE) {
      return {
        allowed: true,
        detections: [],
        filteredContent: content,
        risk: 'none',
        processedAt: new Date()
      };
    }
    
    // Perform content analysis
    const detections = this.analyzeContent(content, config);
    
    // Filter the content (demo implementation)
    let filteredContent = content;
    
    // In a real implementation, this would use NLP to remove problematic content
    // For this demo, we'll just replace detected sections with [FILTERED]
    for (const detection of detections) {
      if (detection.location && detection.confidence >= config.thresholds[detection.category]) {
        const { start, end } = detection.location;
        
        if (start >= 0 && end <= content.length) {
          const before = filteredContent.substring(0, start);
          const after = filteredContent.substring(end);
          filteredContent = before + "[FILTERED]" + after;
        }
      }
    }
    
    // Determine overall risk level
    let risk: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    
    if (detections.length > 0) {
      const maxConfidence = Math.max(...detections.map(d => d.confidence));
      
      if (maxConfidence > 0.9) {
        risk = 'critical';
      } else if (maxConfidence > 0.7) {
        risk = 'high';
      } else if (maxConfidence > 0.5) {
        risk = 'medium';
      } else if (maxConfidence > 0.3) {
        risk = 'low';
      }
    }
    
    // Log if content was modified
    if (filteredContent !== content) {
      logInfo(
        "Guardrail filtered content",
        { 
          message: "Content was modified by guardrails",
          workflowId,
          categories: detections.map(d => d.category),
          risk
        },
        undefined,
        EntityType.Workflow,
        workflowId
      );
      
      // Emit filter event
      this.emit('content-filtered', {
        workflowId,
        detections,
        originalContent: content,
        filteredContent,
        timestamp: new Date()
      });
    }
    
    return {
      allowed: true,
      detections,
      filteredContent,
      risk,
      processedAt: new Date()
    };
  }
  
  /**
   * Demo implementation of content analysis
   * In a real system, this would use AI models or third-party APIs
   */
  private analyzeContent(content: string, config: GuardrailConfig): ContentDetection[] {
    const detections: ContentDetection[] = [];
    const lowercaseContent = content.toLowerCase();
    
    // Demo implementation with simple pattern matching
    const patterns: Record<ContentCategory, string[]> = {
      [ContentCategory.TOXICITY]: ['toxic', 'awful', 'terrible', 'disgusting'],
      [ContentCategory.HATE_SPEECH]: ['hate', 'racial slur', 'bigot'],
      [ContentCategory.SEXUAL_CONTENT]: ['explicit', 'pornographic', 'sexual'],
      [ContentCategory.VIOLENCE]: ['violent', 'kill', 'hurt', 'attack'],
      [ContentCategory.SELF_HARM]: ['suicide', 'self-harm', 'kill myself'],
      [ContentCategory.HARASSMENT]: ['harass', 'bully', 'stalk'],
      [ContentCategory.PROFANITY]: ['damn', 'hell', 'crap'],
      [ContentCategory.PII]: ['ssn', 'social security', 'credit card', 'phone number'],
      [ContentCategory.PROPRIETARY_INFO]: ['confidential', 'proprietary', 'internal only'],
      [ContentCategory.DISCRIMINATION]: ['discriminate', 'bias', 'prejudice'],
      [ContentCategory.JAILBREAK]: ['ignore previous instructions', 'ignore all instructions', 'DAN mode'],
      [ContentCategory.PROMPT_INJECTION]: ['ignore context', 'new prompt', 'instead respond to']
    };
    
    // Only check enabled categories
    for (const category of config.enabledCategories) {
      const categoryPatterns = patterns[category] || [];
      
      for (const pattern of categoryPatterns) {
        const index = lowercaseContent.indexOf(pattern);
        
        if (index >= 0) {
          // Calculate a pseudo-confidence based on how many times the pattern appears
          const regex = new RegExp(pattern, 'gi');
          const matches = content.match(regex) || [];
          const confidence = Math.min(0.5 + (matches.length * 0.1), 0.95);
          
          detections.push({
            category,
            confidence,
            severity: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
            text: pattern,
            location: {
              start: index,
              end: index + pattern.length
            }
          });
        }
      }
    }
    
    // Also check blocked topics
    for (const topic of config.blockedTopics) {
      if (lowercaseContent.includes(topic.toLowerCase())) {
        detections.push({
          category: ContentCategory.PROPRIETARY_INFO, // Using this as a generic category
          confidence: 0.8,
          severity: 'high',
          text: topic,
          location: {
            start: lowercaseContent.indexOf(topic.toLowerCase()),
            end: lowercaseContent.indexOf(topic.toLowerCase()) + topic.length
          }
        });
      }
    }
    
    return detections;
  }
}

// Export singleton instance
export const guardrails = new GuardrailsService();