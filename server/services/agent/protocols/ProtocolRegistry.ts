/**
 * ProtocolRegistry
 * 
 * A registry for all agent protocols in the system.
 * Handles registration, discovery, and instantiation of agent protocols.
 */

import { BaseProtocol, ProtocolMetadata } from './BaseProtocol';

export class ProtocolRegistry {
  private static instance: ProtocolRegistry;
  private protocols: Map<string, new () => BaseProtocol> = new Map();
  private protocolMetadata: Map<string, ProtocolMetadata> = new Map();

  // Private constructor for singleton pattern
  private constructor() {}

  // Get singleton instance
  public static getInstance(): ProtocolRegistry {
    if (!ProtocolRegistry.instance) {
      ProtocolRegistry.instance = new ProtocolRegistry();
    }
    return ProtocolRegistry.instance;
  }

  // Register a new protocol
  public registerProtocol(
    name: string, 
    protocolClass: new () => BaseProtocol,
    metadata: ProtocolMetadata
  ): void {
    if (this.protocols.has(name)) {
      console.warn(`Protocol with name ${name} already registered. Overwriting.`);
    }
    this.protocols.set(name, protocolClass);
    this.protocolMetadata.set(name, metadata);
  }

  // Get a protocol by name
  public getProtocol(name: string): new () => BaseProtocol {
    const protocol = this.protocols.get(name);
    if (!protocol) {
      throw new Error(`Protocol ${name} not found in registry`);
    }
    return protocol;
  }

  // Create a new instance of a protocol
  public createProtocolInstance(name: string): BaseProtocol {
    const ProtocolClass = this.getProtocol(name);
    return new ProtocolClass();
  }

  // Get metadata for a protocol
  public getProtocolMetadata(name: string): ProtocolMetadata {
    const metadata = this.protocolMetadata.get(name);
    if (!metadata) {
      throw new Error(`Metadata for protocol ${name} not found in registry`);
    }
    return metadata;
  }

  // List all registered protocols
  public listProtocols(): { name: string; metadata: ProtocolMetadata }[] {
    return Array.from(this.protocols.keys()).map(name => ({
      name,
      metadata: this.protocolMetadata.get(name)!
    }));
  }

  // Check if a protocol is registered
  public hasProtocol(name: string): boolean {
    return this.protocols.has(name);
  }

  // Unregister a protocol
  public unregisterProtocol(name: string): boolean {
    if (!this.protocols.has(name)) {
      return false;
    }
    this.protocols.delete(name);
    this.protocolMetadata.delete(name);
    return true;
  }
}