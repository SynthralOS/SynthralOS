import { NodeCategory, NodeType } from './node-types';
import { 
  LangGraphStateNodeSchema, 
  LangGraphNodeSchema,
  LangGraphEdgeSchema,
  LangGraphConditionalNodeSchema,
  AgentNodeSchema as LangGraphAgentNodeSchema,
  AgentSupervisorNodeSchema,
  MemoryStoreNodeSchema,
  ContextRetrieverNodeSchema,
  ToolNodeSchema,
  ToolExecutorNodeSchema,
  ConversationChainNodeSchema,
  ConversationRouterNodeSchema,
  OutputParserNodeSchema,
  OutputFormatterNodeSchema
} from './langgraph-nodes';

// Define the node definitions for all LangGraph nodes
export const langGraphNodeDefinitions = {
  // LangGraph Core Nodes
  [NodeType.LANGGRAPH_STATE]: {
    type: NodeType.LANGGRAPH_STATE,
    category: NodeCategory.LANGGRAPH,
    label: 'State Container',
    description: 'Container for graph state',
    icon: 'Database',
    inputs: 0,
    outputs: 1,
    schema: LangGraphStateNodeSchema,
    defaultData: {
      name: 'State',
      stateType: 'graph',
      stateDefinition: {},
      initialState: {},
    },
  },
  [NodeType.LANGGRAPH_NODE]: {
    type: NodeType.LANGGRAPH_NODE,
    category: NodeCategory.LANGGRAPH,
    label: 'LangGraph Node',
    description: 'General purpose LangGraph node',
    icon: 'Circle',
    inputs: 1,
    outputs: 1,
    schema: LangGraphNodeSchema,
    defaultData: {
      name: 'LangGraph Node',
      functionDefinition: '',
      inputVariables: [],
      outputVariables: [],
    },
  },
  [NodeType.LANGGRAPH_EDGE]: {
    type: NodeType.LANGGRAPH_EDGE,
    category: NodeCategory.LANGGRAPH,
    label: 'Graph Edge',
    description: 'Connection between graph nodes',
    icon: 'ArrowRight',
    inputs: 1,
    outputs: 1,
    schema: LangGraphEdgeSchema,
    defaultData: {
      name: 'Edge',
      sourceNode: '',
      targetNode: '',
      condition: '',
    },
  },
  [NodeType.LANGGRAPH_CONDITIONAL]: {
    type: NodeType.LANGGRAPH_CONDITIONAL,
    category: NodeCategory.LANGGRAPH,
    label: 'Conditional Router',
    description: 'Routes flow based on conditions',
    icon: 'GitMerge',
    inputs: 1,
    outputs: 3,
    schema: LangGraphConditionalNodeSchema,
    defaultData: {
      name: 'Conditional Router',
      conditions: [
        {
          condition: '',
          targetNodeId: '',
        },
      ],
    },
  },
  
  // Agent Nodes
  [NodeType.AGENT_NODE]: {
    type: NodeType.AGENT_NODE,
    category: NodeCategory.AGENT,
    label: 'LLM Agent',
    description: 'AI agent that can use tools and take actions',
    icon: 'Bot',
    inputs: 1,
    outputs: 1,
    schema: LangGraphAgentNodeSchema,
    defaultData: {
      name: 'Agent',
      agentType: 'assistant',
      modelName: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      temperature: 0.7,
      systemPrompt: '',
      tools: [],
      maxIterations: 10,
    },
  },
  [NodeType.AGENT_SUPERVISOR]: {
    type: NodeType.AGENT_SUPERVISOR,
    category: NodeCategory.AGENT,
    label: 'Agent Supervisor',
    description: 'Coordinates multiple agents',
    icon: 'Users',
    inputs: 1,
    outputs: 1,
    schema: AgentSupervisorNodeSchema,
    defaultData: {
      name: 'Supervisor',
      modelName: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      temperature: 0.7,
      systemPrompt: '',
      agentIds: [],
    },
  },
  
  // Memory Nodes
  [NodeType.MEMORY_STORE]: {
    type: NodeType.MEMORY_STORE,
    category: NodeCategory.MEMORY,
    label: 'Memory Store',
    description: 'Stores conversation or execution memory',
    icon: 'HardDrive',
    inputs: 1,
    outputs: 1,
    schema: MemoryStoreNodeSchema,
    defaultData: {
      name: 'Memory',
      memoryType: 'buffer',
      capacity: 10,
      persistenceType: 'in-memory',
    },
  },
  [NodeType.CONTEXT_RETRIEVER]: {
    type: NodeType.CONTEXT_RETRIEVER,
    category: NodeCategory.MEMORY,
    label: 'Context Retriever',
    description: 'Retrieves relevant context',
    icon: 'Search',
    inputs: 1,
    outputs: 1,
    schema: ContextRetrieverNodeSchema,
    defaultData: {
      name: 'Retriever',
      retrieverType: 'vector',
      topK: 5,
    },
  },
  
  // Tool Nodes
  [NodeType.TOOL_NODE]: {
    type: NodeType.TOOL_NODE,
    category: NodeCategory.UTILITY,
    label: 'Tool',
    description: 'Tool for agents to use',
    icon: 'Wrench',
    inputs: 1,
    outputs: 1,
    schema: ToolNodeSchema,
    defaultData: {
      name: 'Tool',
      toolType: 'custom',
      functionDefinition: '',
      parameters: {},
    },
  },
  [NodeType.TOOL_EXECUTOR]: {
    type: NodeType.TOOL_EXECUTOR,
    category: NodeCategory.UTILITY,
    label: 'Tool Executor',
    description: 'Executes tools',
    icon: 'Terminal',
    inputs: 1,
    outputs: 1,
    schema: ToolExecutorNodeSchema,
    defaultData: {
      name: 'Tool Executor',
      toolIds: [],
    },
  },
  
  // Conversation Nodes
  [NodeType.CONVERSATION_CHAIN]: {
    type: NodeType.CONVERSATION_CHAIN,
    category: NodeCategory.CONVERSATION,
    label: 'Conversation Chain',
    description: 'Chain for conversation',
    icon: 'MessageCircle',
    inputs: 1,
    outputs: 1,
    schema: ConversationChainNodeSchema,
    defaultData: {
      name: 'Conversation',
      modelName: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      temperature: 0.7,
      systemPrompt: '',
    },
  },
  [NodeType.CONVERSATION_ROUTER]: {
    type: NodeType.CONVERSATION_ROUTER,
    category: NodeCategory.CONVERSATION,
    label: 'Conversation Router',
    description: 'Routes conversations',
    icon: 'GitBranch',
    inputs: 1,
    outputs: 2,
    schema: ConversationRouterNodeSchema,
    defaultData: {
      name: 'Router',
      modelName: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      temperature: 0.7,
      systemPrompt: '',
      routes: [
        {
          name: 'Default Route',
          description: 'Default route',
          targetNodeId: '',
        },
      ],
    },
  },
  
  // Output Formatting Nodes
  [NodeType.OUTPUT_PARSER]: {
    type: NodeType.OUTPUT_PARSER,
    category: NodeCategory.PROCESSING,
    label: 'Output Parser',
    description: 'Parses LLM outputs',
    icon: 'FileJson',
    inputs: 1,
    outputs: 1,
    schema: OutputParserNodeSchema,
    defaultData: {
      name: 'Parser',
      parserType: 'json',
      parserDefinition: '',
    },
  },
  [NodeType.OUTPUT_FORMATTER]: {
    type: NodeType.OUTPUT_FORMATTER,
    category: NodeCategory.PROCESSING,
    label: 'Output Formatter',
    description: 'Formats output',
    icon: 'FileText',
    inputs: 1,
    outputs: 1,
    schema: OutputFormatterNodeSchema,
    defaultData: {
      name: 'Formatter',
      formatType: 'json',
      formatTemplate: '',
    },
  },
};