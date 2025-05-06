/**
 * LangGraph Templates
 * 
 * This file contains templates for common agent conversation flows.
 * These templates can be used to create complex multi-step LLM workflows.
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { StateGraph, DEFAULT_HANDLE_NAME } from '@langchain/langgraph';
import { 
  ChatPromptTemplate, 
  MessagesPlaceholder, 
  PromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate
} from '@langchain/core/prompts';
import { 
  ChatAnthropic
} from '@langchain/anthropic';
import { 
  RunnableConfig, 
  RunnablePassthrough,
  RunnableLambda
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AgentExecutor } from '@langchain/core/agents';
import { log } from '../vite';

// Make sure the ANTHROPIC_API_KEY is available
if (!process.env.ANTHROPIC_API_KEY) {
  log('ANTHROPIC_API_KEY environment variable is not set', 'langgraph-templates');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define a base model that can be reused
const getBaseModel = (modelName: string, temperature: number) => {
  return new ChatAnthropic({
    modelName: modelName || 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    anthropic,
    temperature: temperature || 0.7,
  });
};

// Base state for all graph templates
export interface GraphState {
  [key: string]: any;
}

/**
 * Create a sequential agent chain
 * This template creates a simple sequential flow of agent steps
 */
export function createSequentialAgentTemplate(
  agentConfigs: Array<{
    name: string;
    systemPrompt: string;
    modelName?: string;
    temperature?: number;
  }>
): StateGraph<GraphState> {
  // Create the state graph
  const graph = new StateGraph<GraphState>({
    channels: {},
  });

  // Add nodes for each agent
  for (const config of agentConfigs) {
    const model = getBaseModel(config.modelName || 'claude-3-7-sonnet-20250219', config.temperature || 0.7);
    
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(config.systemPrompt),
      new MessagesPlaceholder('history'),
      HumanMessagePromptTemplate.fromTemplate('{input}')
    ]);

    const chain = prompt
      .pipe(model)
      .pipe(new StringOutputParser());
    
    // Add the node
    graph.addNode(config.name, RunnableLambda.from(async (state: GraphState) => {
      const response = await chain.invoke({
        input: state.input,
        history: state.history || []
      });
      
      return {
        ...state,
        [config.name + '_output']: response,
        output: response, // Also update the main output
        history: [
          ...(state.history || []),
          { role: 'human', content: state.input },
          { role: 'assistant', content: response }
        ]
      };
    }));
  }

  // Connect the nodes sequentially
  for (let i = 0; i < agentConfigs.length - 1; i++) {
    graph.addEdge(agentConfigs[i].name, agentConfigs[i + 1].name);
  }

  // Set the entry point to the first agent
  if (agentConfigs.length > 0) {
    graph.setEntryPoint(agentConfigs[0].name);
  }

  return graph;
}

/**
 * Create a branching agent template
 * This template creates a conversation flow with conditional branching
 */
export function createBranchingAgentTemplate(
  entryAgentConfig: {
    name: string;
    systemPrompt: string;
    modelName?: string;
    temperature?: number;
  },
  branchConfigs: Array<{
    name: string;
    condition: string; // JavaScript condition to evaluate
    agent: {
      name: string;
      systemPrompt: string;
      modelName?: string;
      temperature?: number;
    };
  }>,
  defaultBranch?: {
    name: string;
    systemPrompt: string;
    modelName?: string;
    temperature?: number;
  }
): StateGraph<GraphState> {
  // Create the state graph
  const graph = new StateGraph<GraphState>({
    channels: {},
  });

  // Add the entry agent node
  const entryModel = getBaseModel(
    entryAgentConfig.modelName || 'claude-3-7-sonnet-20250219',
    entryAgentConfig.temperature || 0.7
  );
  
  const entryPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(entryAgentConfig.systemPrompt),
    new MessagesPlaceholder('history'),
    HumanMessagePromptTemplate.fromTemplate('{input}')
  ]);

  const entryChain = entryPrompt
    .pipe(entryModel)
    .pipe(new StringOutputParser());
  
  // Add the entry node
  graph.addNode(entryAgentConfig.name, RunnableLambda.from(async (state: GraphState) => {
    const response = await entryChain.invoke({
      input: state.input,
      history: state.history || []
    });
    
    return {
      ...state,
      [entryAgentConfig.name + '_output']: response,
      output: response, // Also update the main output
      history: [
        ...(state.history || []),
        { role: 'human', content: state.input },
        { role: 'assistant', content: response }
      ]
    };
  }));

  // Add the branch agent nodes
  for (const branch of branchConfigs) {
    const branchModel = getBaseModel(
      branch.agent.modelName || 'claude-3-7-sonnet-20250219',
      branch.agent.temperature || 0.7
    );
    
    const branchPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(branch.agent.systemPrompt),
      new MessagesPlaceholder('history'),
      HumanMessagePromptTemplate.fromTemplate('{input}')
    ]);

    const branchChain = branchPrompt
      .pipe(branchModel)
      .pipe(new StringOutputParser());
    
    // Add the branch node
    graph.addNode(branch.agent.name, RunnableLambda.from(async (state: GraphState) => {
      const response = await branchChain.invoke({
        input: state.input,
        history: state.history || []
      });
      
      return {
        ...state,
        [branch.agent.name + '_output']: response,
        output: response, // Also update the main output
        history: [
          ...(state.history || []),
          { role: 'human', content: state.input },
          { role: 'assistant', content: response }
        ]
      };
    }));
  }

  // Add the default branch if provided
  if (defaultBranch) {
    const defaultModel = getBaseModel(
      defaultBranch.modelName || 'claude-3-7-sonnet-20250219',
      defaultBranch.temperature || 0.7
    );
    
    const defaultPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(defaultBranch.systemPrompt),
      new MessagesPlaceholder('history'),
      HumanMessagePromptTemplate.fromTemplate('{input}')
    ]);

    const defaultChain = defaultPrompt
      .pipe(defaultModel)
      .pipe(new StringOutputParser());
    
    // Add the default node
    graph.addNode(defaultBranch.name, RunnableLambda.from(async (state: GraphState) => {
      const response = await defaultChain.invoke({
        input: state.input,
        history: state.history || []
      });
      
      return {
        ...state,
        [defaultBranch.name + '_output']: response,
        output: response, // Also update the main output
        history: [
          ...(state.history || []),
          { role: 'human', content: state.input },
          { role: 'assistant', content: response }
        ]
      };
    }));
  }

  // Add conditional routing
  const routingFunction = (state: GraphState) => {
    for (const branch of branchConfigs) {
      try {
        // Create a function from the condition string
        const conditionFn = new Function('state', `return ${branch.condition};`);
        
        if (conditionFn(state)) {
          return branch.agent.name;
        }
      } catch (error) {
        console.error(`Error evaluating condition "${branch.condition}":`, error);
      }
    }
    
    // If no condition matched and there's a default branch, return it
    if (defaultBranch) {
      return defaultBranch.name;
    }
    
    // No matching branch or default, return null for end of graph
    return null;
  };

  // Add the conditional routing
  graph.addConditionalEdges(entryAgentConfig.name, routingFunction);

  // Set the entry point
  graph.setEntryPoint(entryAgentConfig.name);

  return graph;
}

/**
 * Create a retrieval-augmented generation (RAG) template
 * This template creates a flow for retrieving context and generating responses
 */
export function createRAGTemplate(
  retrieverConfig: {
    name: string;
    retrievalFunction: (query: string) => Promise<string[]>;
  },
  generatorConfig: {
    name: string;
    systemPrompt: string;
    modelName?: string;
    temperature?: number;
  }
): StateGraph<GraphState> {
  // Create the state graph
  const graph = new StateGraph<GraphState>({
    channels: {},
  });

  // Add the retriever node
  graph.addNode(retrieverConfig.name, RunnableLambda.from(async (state: GraphState) => {
    const query = state.input;
    
    // Get documents from the retrieval function
    const documents = await retrieverConfig.retrievalFunction(query);
    
    return {
      ...state,
      documents,
      context: documents.join('\\n\\n')
    };
  }));

  // Add the generator node
  const generatorModel = getBaseModel(
    generatorConfig.modelName || 'claude-3-7-sonnet-20250219',
    generatorConfig.temperature || 0.7
  );
  
  // Create a prompt that includes the retrieved context
  const generatorPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(generatorConfig.systemPrompt),
    SystemMessagePromptTemplate.fromTemplate(
      'Here is some context that may be helpful:\n{context}'
    ),
    new MessagesPlaceholder('history'),
    HumanMessagePromptTemplate.fromTemplate('{input}')
  ]);

  const generatorChain = generatorPrompt
    .pipe(generatorModel)
    .pipe(new StringOutputParser());
  
  // Add the generator node
  graph.addNode(generatorConfig.name, RunnableLambda.from(async (state: GraphState) => {
    const response = await generatorChain.invoke({
      input: state.input,
      context: state.context || '',
      history: state.history || []
    });
    
    return {
      ...state,
      output: response,
      history: [
        ...(state.history || []),
        { role: 'human', content: state.input },
        { role: 'assistant', content: response }
      ]
    };
  }));

  // Connect retriever to generator
  graph.addEdge(retrieverConfig.name, generatorConfig.name);

  // Set the entry point
  graph.setEntryPoint(retrieverConfig.name);

  return graph;
}

/**
 * Create a multi-agent conversation template
 * This template creates a conversation between multiple specialized agents
 */
export function createMultiAgentTemplate(
  agentConfigs: Array<{
    name: string;
    role: string;
    systemPrompt: string;
    modelName?: string;
    temperature?: number;
  }>,
  moderatorConfig: {
    name: string;
    systemPrompt: string;
    modelName?: string;
    temperature?: number;
    maxTurns?: number;
  }
): StateGraph<GraphState> {
  // Create the state graph
  const graph = new StateGraph<GraphState>({
    channels: {},
  });

  // Add nodes for each agent
  for (const config of agentConfigs) {
    const model = getBaseModel(config.modelName || 'claude-3-7-sonnet-20250219', config.temperature || 0.7);
    
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `You are ${config.role}. ${config.systemPrompt}`
      ),
      new MessagesPlaceholder('conversation'),
      HumanMessagePromptTemplate.fromTemplate('Your turn to speak. Respond to the conversation above.')
    ]);

    const chain = prompt
      .pipe(model)
      .pipe(new StringOutputParser());
    
    // Add the node
    graph.addNode(config.name, RunnableLambda.from(async (state: GraphState) => {
      const response = await chain.invoke({
        conversation: state.conversation || []
      });
      
      // Add this agent's response to the conversation
      const updatedConversation = [
        ...(state.conversation || []),
        { role: config.role, content: response }
      ];
      
      return {
        ...state,
        [config.name + '_output']: response,
        conversation: updatedConversation,
        current_turn: (state.current_turn || 0) + 1
      };
    }));
  }

  // Add the moderator node
  const moderatorModel = getBaseModel(
    moderatorConfig.modelName || 'claude-3-7-sonnet-20250219',
    moderatorConfig.temperature || 0.7
  );
  
  const moderatorPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are the moderator of this conversation. ${moderatorConfig.systemPrompt}\n
      You need to decide which agent should speak next, or if the conversation should end.
      Available agents: ${agentConfigs.map(a => a.name).join(', ')}.
      You must respond with ONLY the name of the next agent, or "END" if the conversation should end.`
    ),
    new MessagesPlaceholder('conversation'),
    HumanMessagePromptTemplate.fromTemplate('Who should speak next?')
  ]);

  const moderatorChain = moderatorPrompt
    .pipe(moderatorModel)
    .pipe(new StringOutputParser());
  
  // Add the moderator node
  graph.addNode(moderatorConfig.name, RunnableLambda.from(async (state: GraphState) => {
    // Check if we've reached the maximum number of turns
    if (state.current_turn && moderatorConfig.maxTurns && state.current_turn >= moderatorConfig.maxTurns) {
      return {
        ...state,
        next_agent: 'END'
      };
    }
    
    // Ask the moderator who should speak next
    const next = await moderatorChain.invoke({
      conversation: state.conversation || []
    });
    
    // Parse the moderator's response to get the next agent
    let nextAgent = next.trim();
    
    // Handle different response formats
    if (nextAgent.includes('\n')) {
      nextAgent = nextAgent.split('\n')[0].trim();
    }
    if (nextAgent.includes(':')) {
      nextAgent = nextAgent.split(':')[1].trim();
    }
    if (nextAgent.includes('"') || nextAgent.includes("'")) {
      nextAgent = nextAgent.replace(/["']/g, '').trim();
    }
    
    return {
      ...state,
      next_agent: nextAgent
    };
  }));

  // Add the entry node to initialize the conversation
  graph.addNode('initiator', RunnableLambda.from((state: GraphState) => {
    return {
      ...state,
      conversation: [
        { role: 'system', content: 'The conversation begins.' },
        { role: 'user', content: state.input }
      ],
      current_turn: 0,
      next_agent: agentConfigs[0].name // Start with the first agent
    };
  }));

  // Create conditional edges from the moderator to the agents
  const moderatorEdges = (state: GraphState) => {
    const nextAgent = state.next_agent;
    
    if (nextAgent === 'END') {
      return null; // End the graph execution
    }
    
    // Find if the next agent exists in our agent configs
    const agentExists = agentConfigs.some(a => a.name === nextAgent);
    
    if (agentExists) {
      return nextAgent;
    } else {
      // Default to the first agent if the specified agent doesn't exist
      return agentConfigs[0].name;
    }
  };

  // Connect initiator to first agent
  graph.addEdge('initiator', agentConfigs[0].name);

  // Connect all agents to the moderator
  for (const agent of agentConfigs) {
    graph.addEdge(agent.name, moderatorConfig.name);
  }

  // Connect moderator to agents conditionally
  graph.addConditionalEdges(moderatorConfig.name, moderatorEdges);

  // Set the entry point
  graph.setEntryPoint('initiator');

  return graph;
}

/**
 * Create a reasoning and action template
 * This template implements a ReAct-style agent that can think, act, and observe
 */
export function createReActTemplate(
  reasonerConfig: {
    name: string;
    systemPrompt: string;
    modelName?: string;
    temperature?: number;
  },
  tools: Array<{
    name: string;
    description: string;
    function: (args: any) => Promise<any>;
  }>
): StateGraph<GraphState> {
  // Create the state graph
  const graph = new StateGraph<GraphState>({
    channels: {},
  });

  // Create the tool descriptions
  const toolDescriptions = tools.map(tool => 
    `${tool.name}: ${tool.description}`
  ).join('\n');

  // Add the reasoner node
  const reasonerModel = getBaseModel(
    reasonerConfig.modelName || 'claude-3-7-sonnet-20250219',
    reasonerConfig.temperature || 0.7
  );
  
  const reasonerPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `${reasonerConfig.systemPrompt}\n
      You must respond in the following format:
      
      Thought: Think about the problem and how to solve it.
      Action: The action to take, must be one of [${tools.map(t => t.name).join(', ')}].
      Action Input: The input to the action as a valid JSON object.
      `
    ),
    new MessagesPlaceholder('history'),
    new MessagesPlaceholder('observations'),
    HumanMessagePromptTemplate.fromTemplate('{input}')
  ]);

  const reasonerChain = reasonerPrompt
    .pipe(reasonerModel)
    .pipe(new StringOutputParser());
  
  // Add the reasoner node
  graph.addNode('reasoner', RunnableLambda.from(async (state: GraphState) => {
    const response = await reasonerChain.invoke({
      input: state.input,
      history: state.history || [],
      observations: state.observations || []
    });
    
    // Parse the response to extract thought, action, and action input
    const thoughtMatch = response.match(/Thought:(.*?)(?=Action:|$)/s);
    const actionMatch = response.match(/Action:(.*?)(?=Action Input:|$)/s);
    const actionInputMatch = response.match(/Action Input:(.*?)(?=$)/s);
    
    const thought = thoughtMatch ? thoughtMatch[1].trim() : '';
    const action = actionMatch ? actionMatch[1].trim() : '';
    const actionInputRaw = actionInputMatch ? actionInputMatch[1].trim() : '{}';
    
    let actionInput = {};
    try {
      actionInput = JSON.parse(actionInputRaw);
    } catch (error) {
      console.error('Failed to parse action input:', error);
    }
    
    return {
      ...state,
      thought,
      action,
      action_input: actionInput,
      history: [
        ...(state.history || []),
        { role: 'assistant', content: response }
      ]
    };
  }));

  // Add the action executor node
  graph.addNode('action_executor', RunnableLambda.from(async (state: GraphState) => {
    const action = state.action;
    const actionInput = state.action_input || {};
    
    // Find the tool
    const tool = tools.find(t => t.name === action);
    
    if (!tool) {
      return {
        ...state,
        observation: `Error: Tool '${action}' not found. Available tools are: ${tools.map(t => t.name).join(', ')}`
      };
    }
    
    try {
      // Execute the tool
      const result = await tool.function(actionInput);
      
      return {
        ...state,
        observation: JSON.stringify(result),
        observations: [
          ...(state.observations || []),
          { role: 'system', content: `Observation: ${JSON.stringify(result)}` }
        ]
      };
    } catch (error: any) {
      const errorMessage = `Error executing tool '${action}': ${error.message}`;
      
      return {
        ...state,
        observation: errorMessage,
        observations: [
          ...(state.observations || []),
          { role: 'system', content: `Observation: ${errorMessage}` }
        ]
      };
    }
  }));

  // Add the response generator node
  graph.addNode('response_generator', RunnableLambda.from(async (state: GraphState) => {
    // If we have a final answer, just return it
    if (state.action === 'FINISH') {
      return {
        ...state,
        output: state.action_input.answer || 'Task complete.'
      };
    }
    
    // Otherwise, continue the loop by sending back to the reasoner
    return state;
  }));

  // Add conditional routing
  const actionRouter = (state: GraphState) => {
    if (state.action === 'FINISH') {
      return null; // End the graph execution
    }
    
    // Go back to reasoner
    return 'reasoner';
  };

  // Connect nodes
  graph.addEdge('reasoner', 'action_executor');
  graph.addEdge('action_executor', 'response_generator');
  graph.addConditionalEdges('response_generator', actionRouter);

  // Set the entry point
  graph.setEntryPoint('reasoner');

  return graph;
}