/**
 * ArchGW integration for SynthralOS
 * 
 * This module provides architecture governance capabilities
 * to ensure consistent architectural standards.
 */

/**
 * Architectural component types
 */
export enum ComponentType {
  API = 'api',
  UI = 'ui',
  SERVICE = 'service',
  DATABASE = 'database',
  INTEGRATION = 'integration',
  AGENT = 'agent',
  RUNTIME = 'runtime',
  SECURITY = 'security',
  MONITORING = 'monitoring',
  OTHER = 'other'
}

/**
 * Architecture validation rule types
 */
export enum RuleType {
  DEPENDENCY = 'dependency', // Component dependency rules
  ACCESS = 'access',         // Access control rules
  PATTERN = 'pattern',       // Pattern enforcement rules
  TECHNOLOGY = 'technology', // Technology constraints
  PERFORMANCE = 'performance' // Performance requirements
}

/**
 * Architecture component
 */
export interface ArchComponent {
  id: string;
  name: string;
  type: ComponentType;
  description: string;
  owner: string;
  repository?: string;
  dependencies: string[]; // IDs of components it depends on
  tags: string[];
  metadata: Record<string, any>;
}

/**
 * Architecture validation rule
 */
export interface ArchRule {
  id: string;
  name: string;
  type: RuleType;
  description: string;
  enabled: boolean;
  condition: string; // JavaScript condition as string
  severity: 'info' | 'warning' | 'error' | 'block';
  componentsFilter?: string[]; // Component IDs this rule applies to, empty means all
  message: string;
}

/**
 * Architecture validation violation
 */
export interface ArchViolation {
  ruleId: string;
  componentId: string;
  severity: 'info' | 'warning' | 'error' | 'block';
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Architecture validation result
 */
export interface ValidationResult {
  pass: boolean;
  violations: ArchViolation[];
  validatedComponents: string[];
  timestamp: string;
}

/**
 * Architecture Governance Service
 */
export class ArchGWService {
  private components: Map<string, ArchComponent>;
  private rules: Map<string, ArchRule>;

  constructor() {
    this.components = new Map();
    this.rules = new Map();
  }

  /**
   * Register a component in the architecture
   */
  registerComponent(component: ArchComponent): ArchComponent {
    this.components.set(component.id, component);
    return component;
  }

  /**
   * Update a component
   */
  updateComponent(id: string, updates: Partial<ArchComponent>): ArchComponent | undefined {
    const component = this.components.get(id);
    if (!component) return undefined;

    const updatedComponent = { ...component, ...updates };
    this.components.set(id, updatedComponent);
    return updatedComponent;
  }

  /**
   * Remove a component
   */
  removeComponent(id: string): boolean {
    return this.components.delete(id);
  }

  /**
   * Get all components
   */
  getComponents(): ArchComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get a component by ID
   */
  getComponent(id: string): ArchComponent | undefined {
    return this.components.get(id);
  }

  /**
   * Add a validation rule
   */
  addRule(rule: ArchRule): ArchRule {
    this.rules.set(rule.id, rule);
    return rule;
  }

  /**
   * Update a rule
   */
  updateRule(id: string, updates: Partial<ArchRule>): ArchRule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  /**
   * Remove a rule
   */
  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Get all validation rules
   */
  getRules(): ArchRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Validate the architecture against all rules
   */
  validateArchitecture(): ValidationResult {
    const violations: ArchViolation[] = [];
    const validatedComponents: string[] = [];
    let pass = true;

    // Get enabled rules
    const enabledRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled);

    // Validate each component against the rules
    for (const component of this.components.values()) {
      validatedComponents.push(component.id);

      for (const rule of enabledRules) {
        // Skip if rule doesn't apply to this component
        if (rule.componentsFilter && 
            rule.componentsFilter.length > 0 &&
            !rule.componentsFilter.includes(component.id)) {
          continue;
        }

        try {
          // Create condition context
          const context = {
            component,
            components: this.getComponents(),
            getComponent: (id: string) => this.getComponent(id),
            type: component.type,
            dependencies: component.dependencies.map(id => this.getComponent(id)),
            tags: component.tags,
            metadata: component.metadata
          };

          // Evaluate rule condition as a predicate function
          // This is a simplified evaluation - in a real implementation, 
          // use a safer evaluation mechanism
          const conditionFn = new Function('context', `return ${rule.condition}`);
          const conditionMet = conditionFn(context);

          if (!conditionMet) {
            violations.push({
              ruleId: rule.id,
              componentId: component.id,
              severity: rule.severity,
              message: rule.message.replace('{component}', component.name),
              timestamp: new Date().toISOString()
            });

            // If this is a blocking rule, mark validation as failed
            if (rule.severity === 'error' || rule.severity === 'block') {
              pass = false;
            }
          }
        } catch (error) {
          console.error(`Error evaluating rule ${rule.id} on component ${component.id}:`, error);
        }
      }
    }

    return {
      pass,
      violations,
      validatedComponents,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get dependencies for a component
   */
  getComponentDependencies(componentId: string): ArchComponent[] {
    const component = this.getComponent(componentId);
    if (!component) return [];
    
    return component.dependencies
      .map(id => this.getComponent(id))
      .filter((c): c is ArchComponent => c !== undefined);
  }

  /**
   * Get components that depend on a component
   */
  getDependentComponents(componentId: string): ArchComponent[] {
    return this.getComponents().filter(c => 
      c.dependencies.includes(componentId)
    );
  }
}

// Export singleton instance
export const archGWService = new ArchGWService();