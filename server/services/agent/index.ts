/**
 * Agent module exports
 * 
 * This file re-exports all the necessary types and interfaces
 * from the agent implementation to provide a clean API.
 */

// Re-export agent types and classes
export { 
  Agent, 
  AgentFactory, 
  AgentType, 
  AgentTool, 
  AgentResponse, 
  AgentCapabilities, 
  AgentOptions, 
  AgentMemory 
} from './agent';

// Re-export protocol types
export {
  ProtocolCapabilities,
  ProtocolConfig,
  ProtocolMetadata,
  ProtocolExecutionOptions,
  ExecutionMode,
  BaseProtocol
} from './protocols/BaseProtocol';

// Re-export registry
export {
  ProtocolRegistry
} from './protocols/ProtocolRegistry';

// Re-export agent framework
export {
  AgentFramework,
  AgentFrameworkConfig,
  AgentFrameworkExecutionResult
} from './AgentFramework';

// Re-export configuration utilities
export {
  configureAgentFramework,
  mapAgentTypeToProtocol,
  checkApiKeys
} from './configureAgentFramework';

// Re-export protocol implementations
export { AgentGPTProtocol } from './protocols/AgentGPTProtocol';
export { AutoGPTProtocol } from './protocols/AutoGPTProtocol';
export { MetaGPTProtocol } from './protocols/MetaGPTProtocol';
export { CrewAIProtocol } from './protocols/CrewAIProtocol';
export { OpenInterpreterProtocol } from './protocols/OpenInterpreterProtocol';
export { ArchonProtocol } from './protocols/ArchonProtocol';