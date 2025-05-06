/**
 * Service Registry - Central hub for accessing all services
 * This allows for dependency injection and easier testing
 */
class ServiceRegistry {
  private services: Map<string, any> = new Map();

  /**
   * Register a service with the registry
   * @param name Service name
   * @param instance Service instance
   */
  register(name: string, instance: any): void {
    this.services.set(name, instance);
  }

  /**
   * Get a service from the registry
   * @param name Service name
   * @returns Service instance
   */
  getService(name: string): any {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not found in registry`);
    }
    return service;
  }

  /**
   * Check if a service exists in the registry
   * @param name Service name
   * @returns True if service exists
   */
  hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Unregister a service from the registry
   * @param name Service name
   */
  unregister(name: string): void {
    this.services.delete(name);
  }

  /**
   * Get all registered service names
   * @returns Array of service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

// Create singleton instance
const serviceRegistry = new ServiceRegistry();

export default serviceRegistry;