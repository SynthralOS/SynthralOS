import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { NodeType } from '@/lib/node-types';
import { Node, Edge } from '@shared/schema';

// Models
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  data: any;
  error?: string;
}

export interface ExecutionContext {
  executionId: string;
  workflowId: number;
  startTime: Date;
  variables: Record<string, any>;
  nodeResults: Record<string, NodeExecutionResult>;
  lastError?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
}

// Main execution engine
export class WorkflowExecutionEngine extends EventEmitter {
  private executionContexts: Record<string, ExecutionContext> = {};
  private nodeHandlers: Record<string, (node: Node, context: ExecutionContext, inputs: any[]) => Promise<any>> = {};
  
  constructor(
    private serviceRegistry: any // Will connect to all needed services
  ) {
    super();
    this.registerNodeHandlers();
  }

  private registerNodeHandlers() {
    // Trigger nodes
    this.nodeHandlers[NodeType.WEBHOOK_TRIGGER] = this.executeHttpWebhookNode.bind(this);
    this.nodeHandlers[NodeType.SCHEDULE_TRIGGER] = this.executeScheduleNode.bind(this);
    
    // Agent nodes
    this.nodeHandlers[NodeType.AGENT_NODE] = this.executeAgentNode.bind(this);
    this.nodeHandlers[NodeType.AGENT_SUPERVISOR] = this.executeAgentSupervisorNode.bind(this);
    
    // Memory nodes
    this.nodeHandlers[NodeType.MEMORY_STORE] = this.executeMemoryStoreNode.bind(this);
    this.nodeHandlers[NodeType.CONTEXT_RETRIEVER] = this.executeContextRetrieverNode.bind(this);
    
    // Control flow nodes
    this.nodeHandlers[NodeType.CONDITION] = this.executeConditionNode.bind(this);
    this.nodeHandlers[NodeType.SWITCH] = this.executeSwitchNode.bind(this);
    this.nodeHandlers[NodeType.LOOP] = this.executeLoopNode.bind(this);
    this.nodeHandlers[NodeType.PARALLEL] = this.executeParallelNode.bind(this);
    
    // Utility nodes
    this.nodeHandlers[NodeType.DELAY] = this.executeDelayNode.bind(this);
    this.nodeHandlers[NodeType.LOGGER] = this.executeLoggerNode.bind(this);
    this.nodeHandlers[NodeType.CODE] = this.executeCodeNode.bind(this);
    this.nodeHandlers[NodeType.VARIABLE] = this.executeVariableNode.bind(this);
    
    // LangGraph nodes
    this.nodeHandlers[NodeType.LANGGRAPH_STATE] = this.executeLangGraphStateNode.bind(this);
    this.nodeHandlers[NodeType.LANGGRAPH_NODE] = this.executeLangGraphNode.bind(this);
    this.nodeHandlers[NodeType.LANGGRAPH_EDGE] = this.executeLangGraphEdgeNode.bind(this);
    
    // Tool nodes
    this.nodeHandlers[NodeType.TOOL_NODE] = this.executeToolNode.bind(this);
    this.nodeHandlers[NodeType.TOOL_EXECUTOR] = this.executeToolExecutorNode.bind(this);
    
    // Output nodes
    this.nodeHandlers[NodeType.OUTPUT_PARSER] = this.executeOutputParserNode.bind(this);
    this.nodeHandlers[NodeType.OUTPUT_FORMATTER] = this.executeOutputFormatterNode.bind(this);
    
    // LangChain specific nodes
    this.nodeHandlers[NodeType.LANGCHAIN_LLM_CHAIN] = this.executeLangChainLLMChainNode.bind(this);
    this.nodeHandlers[NodeType.LANGCHAIN_AGENT] = this.executeLangChainAgentNode.bind(this);
    this.nodeHandlers[NodeType.LANGCHAIN_RETRIEVAL] = this.executeLangChainRetrievalNode.bind(this);
    
    // OCR nodes
    this.nodeHandlers[NodeType.OCR_PROCESSOR] = this.executeOcrProcessorNode.bind(this);
    this.nodeHandlers[NodeType.OCR_ENGINE_SELECTOR] = this.executeOcrEngineSelectorNode.bind(this);
    
    // Web Scraping nodes
    this.nodeHandlers[NodeType.WEB_SCRAPER] = this.executeWebScraperNode.bind(this);
  }

  async executeWorkflow(workflowId: number, workflow: { nodes: Node[], edges: Edge[] }, initialVariables: Record<string, any> = {}): Promise<string> {
    // Create an execution context
    const executionId = uuidv4();
    const context: ExecutionContext = {
      executionId,
      workflowId,
      startTime: new Date(),
      variables: { ...initialVariables },
      nodeResults: {},
      status: 'pending'
    };
    
    this.executionContexts[executionId] = context;
    
    try {
      // Find starting nodes (nodes with no incoming edges)
      const startingNodes = this.findStartingNodes(workflow.nodes, workflow.edges);
      
      if (startingNodes.length === 0) {
        throw new Error('No starting nodes found in workflow');
      }
      
      // Update status to running
      context.status = 'running';
      this.emit('execution:status', { executionId, status: 'running' });
      
      // Execute starting nodes
      for (const startNode of startingNodes) {
        await this.executeNode(startNode, context, workflow.nodes, workflow.edges);
      }
      
      // Update status to completed
      context.status = 'completed';
      this.emit('execution:status', { executionId, status: 'completed' });
      
      return executionId;
    } catch (error: any) {
      // Update status to failed
      context.status = 'failed';
      context.lastError = error.message;
      this.emit('execution:status', { executionId, status: 'failed', error: error.message });
      throw error;
    }
  }

  async executeNode(node: Node, context: ExecutionContext, allNodes: Node[], allEdges: Edge[]): Promise<any> {
    try {
      // Emit node execution start event
      this.emit('node:start', { executionId: context.executionId, nodeId: node.id });
      
      // Get inputs for the node
      const inputs = await this.getNodeInputs(node, context, allNodes, allEdges);
      
      // Get node handler
      const nodeType = node.type || '';
      const handler = this.nodeHandlers[nodeType];
      if (!handler) {
        throw new Error(`No handler registered for node type: ${nodeType}`);
      }
      
      // Execute node
      const result = await handler(node, context, inputs);
      
      // Store result in context
      context.nodeResults[node.id] = {
        nodeId: node.id,
        success: true,
        data: result
      };
      
      // Emit node execution success event
      this.emit('node:success', { 
        executionId: context.executionId, 
        nodeId: node.id,
        data: result 
      });
      
      // Find and execute next nodes
      const nextNodes = this.findNextNodes(node, allNodes, allEdges);
      
      for (const nextNode of nextNodes) {
        await this.executeNode(nextNode, context, allNodes, allEdges);
      }
      
      return result;
    } catch (error: any) {
      // Store error in context
      context.nodeResults[node.id] = {
        nodeId: node.id,
        success: false,
        data: null,
        error: error.message
      };
      
      // Emit node execution error event
      this.emit('node:error', { 
        executionId: context.executionId, 
        nodeId: node.id,
        error: error.message
      });
      
      throw error;
    }
  }

  async getNodeInputs(node: Node, context: ExecutionContext, allNodes: Node[], allEdges: Edge[]): Promise<any[]> {
    // Find incoming edges to this node
    const incomingEdges = allEdges.filter(edge => edge.target === node.id);
    
    if (incomingEdges.length === 0) {
      return []; // No inputs
    }
    
    // Get results from source nodes
    const inputs = [];
    for (const edge of incomingEdges) {
      const sourceNode = allNodes.find(n => n.id === edge.source);
      if (!sourceNode) {
        throw new Error(`Source node ${edge.source} not found for edge ${edge.id}`);
      }
      
      const sourceResult = context.nodeResults[sourceNode.id];
      if (!sourceResult) {
        throw new Error(`Result for source node ${sourceNode.id} not found in context`);
      }
      
      if (!sourceResult.success) {
        throw new Error(`Source node ${sourceNode.id} execution failed: ${sourceResult.error}`);
      }
      
      inputs.push(sourceResult.data);
    }
    
    return inputs;
  }

  findStartingNodes(nodes: Node[], edges: Edge[]): Node[] {
    // Starting nodes are nodes with no incoming edges
    const nodesWithIncomingEdges = new Set(edges.map(edge => edge.target));
    return nodes.filter(node => !nodesWithIncomingEdges.has(node.id));
  }

  findNextNodes(currentNode: Node, allNodes: Node[], allEdges: Edge[]): Node[] {
    // Find outgoing edges from this node
    const outgoingEdges = allEdges.filter(edge => edge.source === currentNode.id);
    
    // Return target nodes
    return outgoingEdges.map(edge => {
      const targetNode = allNodes.find(node => node.id === edge.target);
      if (!targetNode) {
        throw new Error(`Target node ${edge.target} not found for edge ${edge.id}`);
      }
      return targetNode;
    });
  }

  getExecutionContext(executionId: string): ExecutionContext | undefined {
    return this.executionContexts[executionId];
  }

  stopExecution(executionId: string): boolean {
    const context = this.executionContexts[executionId];
    if (!context || context.status !== 'running') {
      return false;
    }
    
    context.status = 'stopped';
    this.emit('execution:status', { executionId, status: 'stopped' });
    return true;
  }

  // Node handler implementations
  
  // Trigger nodes
  private async executeHttpWebhookNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    // For webhook nodes, we're mostly passing through the webhook data
    // This would be triggered by the webhook controller
    return {
      method: node.data?.method || 'GET',
      headers: node.data?.headers || {},
      query: node.data?.query || {},
      body: inputs.length > 0 ? inputs[0] : {}
    };
  }

  private async executeScheduleNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    // For schedule nodes, return timing information
    return {
      timestamp: Date.now(),
      scheduledTime: node.data?.schedule || 'now',
      iteration: 1
    };
  }
  
  // Agent nodes
  private async executeAgentNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    // Connect to agent service for execution
    try {
      const agentService = this.serviceRegistry.getService('agent');
      return await agentService.executeAgent({
        agentType: node.data?.agentType || 'default',
        systemPrompt: node.data?.systemPrompt || '',
        modelSettings: node.data?.modelSettings || {},
        input: inputs.length > 0 ? inputs[0] : {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('Agent execution error:', error);
      throw new Error(`Agent execution failed: ${error.message}`);
    }
  }

  private async executeAgentSupervisorNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    // Connect to agent service for supervisor
    try {
      const agentService = this.serviceRegistry.getService('agent');
      return await agentService.executeSupervisor({
        agents: inputs,
        oversightLevel: node.data?.oversightLevel || 'medium',
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('Agent supervisor error:', error);
      throw new Error(`Agent supervisor execution failed: ${error.message}`);
    }
  }
  
  // Memory nodes
  private async executeMemoryStoreNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const memoryService = this.serviceRegistry.getService('memory');
      return await memoryService.storeMemory({
        storeType: node.data?.storeType || 'in-memory',
        contextWindow: node.data?.contextWindow || 10,
        input: inputs.length > 0 ? inputs[0] : {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('Memory store error:', error);
      throw new Error(`Memory store operation failed: ${error.message}`);
    }
  }

  private async executeContextRetrieverNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const memoryService = this.serviceRegistry.getService('memory');
      return await memoryService.retrieveContext({
        retrievalSource: node.data?.retrievalSource || 'memory-store',
        queryType: node.data?.queryType || 'semantic',
        query: inputs.length > 0 ? inputs[0]?.query || inputs[0] : '',
        topK: node.data?.topK || 5,
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('Context retrieval error:', error);
      throw new Error(`Context retrieval failed: ${error.message}`);
    }
  }
  
  // Control flow nodes
  private async executeConditionNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const conditionType = node.data?.conditionType || 'simple';
    const input = inputs.length > 0 ? inputs[0] : {};
    
    let result = false;
    
    if (conditionType === 'simple') {
      const variable = node.data?.variable || '';
      const operator = node.data?.operator || 'equals';
      const value = node.data?.value;
      
      const inputValue = input[variable];
      
      switch (operator) {
        case 'equals':
          result = inputValue === value;
          break;
        case 'notEquals':
          result = inputValue !== value;
          break;
        case 'contains':
          result = String(inputValue).includes(String(value));
          break;
        case 'greaterThan':
          result = inputValue > value;
          break;
        case 'lessThan':
          result = inputValue < value;
          break;
        default:
          result = false;
      }
    } else if (conditionType === 'advanced') {
      const runtimeService = this.serviceRegistry.getService('runtime');
      result = await runtimeService.evaluateExpression({
        expression: node.data?.expression || '',
        context: input,
        executionId: context.executionId
      });
    }
    
    return { result, input };
  }

  private async executeSwitchNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const inputVariable = node.data?.inputVariable || '';
    const cases = node.data?.cases || [];
    const input = inputs.length > 0 ? inputs[0] : {};
    
    const inputValue = input[inputVariable];
    
    // Find matching case
    const matchingCase = cases.find((c: { value: any; label: string }) => c.value === inputValue);
    
    return {
      case: matchingCase?.label || 'default',
      value: inputValue,
      input
    };
  }

  private async executeLoopNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const loopType = node.data?.loopType || 'iteration';
    const input = inputs.length > 0 ? inputs[0] : {};
    
    if (loopType === 'iteration') {
      const iterations = node.data?.iterations || 1;
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        results.push({ iteration: i, input });
      }
      
      return {
        results,
        count: iterations
      };
    } else if (loopType === 'collection') {
      const collection = input[node.data?.collection] || [];
      
      return {
        results: collection.map((item: any, index: number) => ({ item, index })),
        count: collection.length
      };
    }
    
    return {
      results: [],
      count: 0
    };
  }

  private async executeParallelNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    // Implementation for parallel execution of branches
    return {
      branches: inputs.length,
      results: inputs
    };
  }
  
  // Utility nodes
  private async executeDelayNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const delayMs = node.data?.delayMs || 1000;
    const input = inputs.length > 0 ? inputs[0] : {};
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return {
      delayed: true,
      delayMs,
      input
    };
  }

  private async executeLoggerNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const logLevel = node.data?.logLevel || 'info';
    const input = inputs.length > 0 ? inputs[0] : {};
    const message = node.data?.message || 'Log message';
    
    console.log(`[${logLevel.toUpperCase()}][${context.executionId}][${node.id}] ${message}`, input);
    
    return {
      logged: true,
      level: logLevel,
      message,
      timestamp: new Date().toISOString(),
      input
    };
  }

  private async executeCodeNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const runtimeService = this.serviceRegistry.getService('runtime');
      return await runtimeService.executeCode({
        code: node.data?.code || '',
        language: node.data?.language || 'javascript',
        input: inputs.length > 0 ? inputs[0] : {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('Code execution error:', error);
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }

  private async executeVariableNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const variableName = node.data?.name || 'variable';
    const variableValue = node.data?.value !== undefined ? node.data.value : (inputs.length > 0 ? inputs[0] : {});
    
    // Store in context variables
    context.variables[variableName] = variableValue;
    
    return {
      name: variableName,
      value: variableValue
    };
  }
  
  // LangGraph nodes
  private async executeLangGraphStateNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    return {
      state: node.data?.state || {},
      input: inputs.length > 0 ? inputs[0] : {}
    };
  }

  private async executeLangGraphNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const langchainService = this.serviceRegistry.getService('langchain');
      return await langchainService.executeLangGraph({
        nodeConfig: node.data || {},
        input: inputs.length > 0 ? inputs[0] : {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('LangGraph execution error:', error);
      throw new Error(`LangGraph execution failed: ${error.message}`);
    }
  }

  private async executeLangGraphEdgeNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    return {
      source: node.data?.source || '',
      target: node.data?.target || '',
      condition: node.data?.condition || 'default',
      input: inputs.length > 0 ? inputs[0] : {}
    };
  }
  
  // Tool nodes
  private async executeToolNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const toolService = this.serviceRegistry.getService('tool');
      return await toolService.executeTool({
        toolType: node.data?.toolType || 'api',
        config: node.data || {},
        input: inputs.length > 0 ? inputs[0] : {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('Tool execution error:', error);
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  private async executeToolExecutorNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const toolService = this.serviceRegistry.getService('tool');
      return await toolService.executeMultipleTools({
        tools: inputs,
        executionMode: node.data?.executionMode || 'sequential',
        concurrencyLimit: node.data?.concurrencyLimit || 1,
        timeout: node.data?.timeout || 30000,
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('Tool executor error:', error);
      throw new Error(`Tool executor failed: ${error.message}`);
    }
  }
  
  // Output nodes
  private async executeOutputParserNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const parserType = node.data?.parserType || 'structured';
    const input = inputs.length > 0 ? inputs[0] : {};
    
    try {
      if (parserType === 'structured') {
        // Parse as JSON if it's a string
        if (typeof input === 'string') {
          return JSON.parse(input);
        }
        return input;
      } else {
        // Unstructured parsing
        return { content: String(input) };
      }
    } catch (error: any) {
      console.error('Output parsing error:', error);
      // Use fallback if available
      if (node.data?.fallback) {
        return node.data.fallback;
      }
      throw new Error(`Output parsing failed: ${error.message}`);
    }
  }

  private async executeOutputFormatterNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const formatType = node.data?.formatType || 'text';
    const template = node.data?.template || '';
    const input = inputs.length > 0 ? inputs[0] : {};
    
    // Simple template replacement
    let output = template;
    for (const [key, value] of Object.entries(input)) {
      output = output.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    
    return {
      formatted: output,
      format: formatType
    };
  }
  
  // LangChain specific nodes
  private async executeLangChainLLMChainNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const langchainService = this.serviceRegistry.getService('langchain');
      return await langchainService.executeLLMChain({
        chainType: node.data?.chainType || 'simple',
        promptTemplates: node.data?.promptTemplates || {},
        modelSettings: node.data?.modelSettings || {},
        input: inputs.length > 0 ? inputs[0] : {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('LangChain LLM chain error:', error);
      throw new Error(`LangChain LLM chain execution failed: ${error.message}`);
    }
  }

  private async executeLangChainAgentNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const langchainService = this.serviceRegistry.getService('langchain');
      return await langchainService.executeAgent({
        agentType: node.data?.agentType || 'zero-shot-react-description',
        tools: node.data?.tools || [],
        input: inputs.length > 0 ? inputs[0] : {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('LangChain agent error:', error);
      throw new Error(`LangChain agent execution failed: ${error.message}`);
    }
  }

  private async executeLangChainRetrievalNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const langchainService = this.serviceRegistry.getService('langchain');
      return await langchainService.executeRetrievalChain({
        chainType: node.data?.chainType || 'stuff',
        retrieverConfig: node.data?.retriever || {},
        input: inputs.length > 0 ? inputs[0] : {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('LangChain retrieval error:', error);
      throw new Error(`LangChain retrieval execution failed: ${error.message}`);
    }
  }
  
  // OCR nodes
  private async executeOcrProcessorNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const ocrService = this.serviceRegistry.getService('ocr');
      return await ocrService.processDocument({
        engine: node.data?.ocrEngine || 'tesseract',
        documentType: node.data?.documentType || 'general',
        document: inputs.length > 0 ? (inputs[0].document || inputs[0]) : '',
        preprocessingOptions: node.data?.preprocessing || {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('OCR processing error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  private async executeOcrEngineSelectorNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    try {
      const ocrService = this.serviceRegistry.getService('ocr');
      return await ocrService.selectEngine({
        document: inputs.length > 0 ? (inputs[0].document || inputs[0]) : '',
        routingLogic: node.data?.routingLogic || 'auto',
        defaultEngine: node.data?.defaultEngine || 'tesseract',
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('OCR engine selection error:', error);
      throw new Error(`OCR engine selection failed: ${error.message}`);
    }
  }
  
  // Web Scraping nodes
  private async executeWebScraperNode(node: Node, context: ExecutionContext, inputs: any[]): Promise<any> {
    const url = node.data?.url || (inputs.length > 0 ? inputs[0]?.url : null);
    
    if (!url) {
      throw new Error('URL is required for web scraping');
    }
    
    try {
      const scrapingService = this.serviceRegistry.getService('scraping');
      return await scrapingService.scrapeWebsite({
        url,
        strategy: node.data?.scrapingStrategy || 'full-page',
        selectors: node.data?.selectors || [],
        options: node.data?.options || {},
        executionId: context.executionId
      });
    } catch (error: any) {
      console.error('Web scraping error:', error);
      throw new Error(`Web scraping failed: ${error.message}`);
    }
  }
}