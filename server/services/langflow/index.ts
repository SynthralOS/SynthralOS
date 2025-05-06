/**
 * Langflow Service
 * 
 * This service integrates with Langflow for visual workflow creation and editing.
 * It provides methods to create, update, execute, and manage workflows created in Langflow.
 */

import { log } from '../../vite';
import { db } from '../../db';
import { workflows } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

// Define the interface for Langflow workflows
export interface LangflowWorkflow {
  id: string;
  name: string;
  description?: string;
  data: any;
  type: string;
  status: 'built' | 'draft' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

// Define the interface for execution result
export interface LangflowExecutionResult {
  id: string;
  workflowId: string;
  inputs: any;
  outputs: any;
  status: 'completed' | 'failed' | 'in_progress';
  error?: string;
  logs?: string[];
  metrics?: any;
  startTime: Date;
  endTime?: Date;
}

// Define the Langflow service class
export class LangflowService {
  private apiUrl: string;
  private apiKey: string | null;
  private isInitialized: boolean = false;

  constructor() {
    this.apiUrl = process.env.LANGFLOW_API_URL || 'http://localhost:7860';
    this.apiKey = process.env.LANGFLOW_API_KEY || null;
    
    if (!this.apiKey) {
      log('LANGFLOW_API_KEY environment variable is not set. Some Langflow features may be limited.', 'langflow');
    }
    
    log('Langflow service initialized', 'langflow');
    this.isInitialized = true;
  }

  /**
   * Check if the Langflow service is available
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v1/health`);
      return response.status === 200;
    } catch (error) {
      log(`Error checking Langflow availability: ${error}`, 'langflow');
      return false;
    }
  }

  /**
   * Set the API key for Langflow
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    process.env.LANGFLOW_API_KEY = apiKey;
    log('Langflow API key set', 'langflow');
  }

  /**
   * Create a new workflow in Langflow
   */
  public async createWorkflow(name: string, description?: string, data?: any): Promise<LangflowWorkflow> {
    try {
      const response = await axios.post(`${this.apiUrl}/api/v1/flows`, {
        name,
        description,
        data: data || this.getDefaultWorkflowTemplate()
      }, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      log(`Error creating Langflow workflow: ${error}`, 'langflow');
      throw new Error(`Failed to create Langflow workflow: ${error}`);
    }
  }

  /**
   * Get a workflow from Langflow by ID
   */
  public async getWorkflow(id: string): Promise<LangflowWorkflow> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v1/flows/${id}`, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      log(`Error fetching Langflow workflow: ${error}`, 'langflow');
      throw new Error(`Failed to fetch Langflow workflow: ${error}`);
    }
  }

  /**
   * Update an existing workflow in Langflow
   */
  public async updateWorkflow(id: string, data: Partial<LangflowWorkflow>): Promise<LangflowWorkflow> {
    try {
      const response = await axios.put(`${this.apiUrl}/api/v1/flows/${id}`, data, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      log(`Error updating Langflow workflow: ${error}`, 'langflow');
      throw new Error(`Failed to update Langflow workflow: ${error}`);
    }
  }

  /**
   * Delete a workflow from Langflow
   */
  public async deleteWorkflow(id: string): Promise<boolean> {
    try {
      await axios.delete(`${this.apiUrl}/api/v1/flows/${id}`, {
        headers: this.getHeaders()
      });

      return true;
    } catch (error) {
      log(`Error deleting Langflow workflow: ${error}`, 'langflow');
      throw new Error(`Failed to delete Langflow workflow: ${error}`);
    }
  }

  /**
   * Execute a workflow in Langflow
   */
  public async executeWorkflow(id: string, inputs: any): Promise<LangflowExecutionResult> {
    try {
      const response = await axios.post(`${this.apiUrl}/api/v1/flows/${id}/execute`, {
        inputs
      }, {
        headers: this.getHeaders()
      });

      return {
        id: response.data.id,
        workflowId: id,
        inputs,
        outputs: response.data.outputs,
        status: response.data.status,
        error: response.data.error,
        logs: response.data.logs,
        metrics: response.data.metrics,
        startTime: new Date(),
        endTime: new Date()
      };
    } catch (error) {
      log(`Error executing Langflow workflow: ${error}`, 'langflow');
      throw new Error(`Failed to execute Langflow workflow: ${error}`);
    }
  }

  /**
   * Get available components from Langflow
   */
  public async getComponents(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v1/components`, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      log(`Error fetching Langflow components: ${error}`, 'langflow');
      throw new Error(`Failed to fetch Langflow components: ${error}`);
    }
  }

  /**
   * Import a workflow from a JSON file
   */
  public async importWorkflow(workflowJson: any): Promise<LangflowWorkflow> {
    try {
      const response = await axios.post(`${this.apiUrl}/api/v1/flows/import`, workflowJson, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      log(`Error importing Langflow workflow: ${error}`, 'langflow');
      throw new Error(`Failed to import Langflow workflow: ${error}`);
    }
  }

  /**
   * Export a workflow to JSON format
   */
  public async exportWorkflow(id: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v1/flows/${id}/export`, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      log(`Error exporting Langflow workflow: ${error}`, 'langflow');
      throw new Error(`Failed to export Langflow workflow: ${error}`);
    }
  }

  /**
   * Convert a SynthralOS workflow to Langflow format
   */
  public async convertToLangflow(workflowId: number): Promise<any> {
    try {
      // Fetch the workflow from the database
      const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
      
      if (!workflow) {
        throw new Error(`Workflow with ID ${workflowId} not found`);
      }
      
      // Convert nodes and edges to Langflow format
      const langflowData = this.convertToLangflowFormat(workflow.data);
      
      // Create a new workflow in Langflow
      return await this.createWorkflow(
        workflow.name,
        workflow.description || undefined,
        langflowData
      );
    } catch (error) {
      log(`Error converting workflow to Langflow: ${error}`, 'langflow');
      throw new Error(`Failed to convert workflow to Langflow: ${error}`);
    }
  }

  /**
   * Convert a Langflow workflow to SynthralOS format
   */
  public async convertFromLangflow(langflowId: string): Promise<any> {
    try {
      // Fetch the workflow from Langflow
      const langflowWorkflow = await this.getWorkflow(langflowId);
      
      // Convert Langflow workflow to SynthralOS format
      const synthralOSData = this.convertFromLangflowFormat(langflowWorkflow.data);
      
      return synthralOSData;
    } catch (error) {
      log(`Error converting Langflow workflow to SynthralOS: ${error}`, 'langflow');
      throw new Error(`Failed to convert Langflow workflow to SynthralOS: ${error}`);
    }
  }

  /**
   * Sync a workflow between SynthralOS and Langflow
   */
  public async syncWorkflow(workflowId: number, langflowId: string): Promise<boolean> {
    try {
      // Fetch both workflows
      const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
      const langflowWorkflow = await this.getWorkflow(langflowId);
      
      if (!workflow) {
        throw new Error(`Workflow with ID ${workflowId} not found`);
      }
      
      if (!langflowWorkflow) {
        throw new Error(`Langflow workflow with ID ${langflowId} not found`);
      }
      
      // Update the metadata in SynthralOS workflow
      const workflowData = workflow.data as Record<string, any>;
      await db.update(workflows)
        .set({
          data: {
            ...workflowData,
            langflowId: langflowId,
            lastSyncedAt: new Date().toISOString()
          }
        })
        .where(eq(workflows.id, workflowId));
      
      return true;
    } catch (error) {
      log(`Error syncing workflow with Langflow: ${error}`, 'langflow');
      throw new Error(`Failed to sync workflow with Langflow: ${error}`);
    }
  }

  /**
   * Generate a default workflow template
   */
  private getDefaultWorkflowTemplate(): any {
    return {
      nodes: [],
      edges: [],
      version: "1.0.0"
    };
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Convert SynthralOS workflow data to Langflow format
   */
  private convertToLangflowFormat(data: any): any {
    // Convert SynthralOS nodes to Langflow nodes
    const langflowNodes = (data.nodes || []).map((node: any) => {
      const langflowType = this.mapNodeTypeToLangflow(node.type);
      const nodeTemplate = this.getLangflowNodeTemplate(langflowType);
      
      // Merge the node template with node data
      return {
        id: node.id,
        type: langflowType,
        position: node.position,
        width: node.width || 200,
        height: node.height || 150,
        selected: node.selected || false,
        positionAbsolute: node.positionAbsolute || node.position,
        dragging: false,
        data: {
          ...nodeTemplate.data,
          ...node.data,
          node_id: node.id,
          type: langflowType,
          // Convert parameters to match Langflow format
          parameters: {
            ...(nodeTemplate.data?.parameters || {}),
            ...(node.data?.parameters || {})
          },
          // Handle display properties
          display_name: node.data?.label || nodeTemplate.data?.display_name || langflowType,
          description: node.data?.description || nodeTemplate.data?.description || ""
        },
        // Style and display properties
        style: {
          ...nodeTemplate.style,
          ...node.style
        }
      };
    });
    
    // Convert SynthralOS edges to Langflow edges
    const langflowEdges = (data.edges || []).map((edge: any) => {
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
        type: edge.type || 'default',
        markerEnd: edge.markerEnd || {
          type: 'arrowclosed',
          width: 20,
          height: 20
        },
        animated: edge.animated || false,
        style: edge.style || {
          stroke: '#555',
          strokeWidth: 2
        }
      };
    });
    
    // Return complete Langflow workflow
    return {
      nodes: langflowNodes,
      edges: langflowEdges,
      viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
      version: "1.0.0",
      description: data.description || "",
      name: data.name || "Converted Workflow"
    };
  }

  /**
   * Convert Langflow workflow data to SynthralOS format
   */
  private convertFromLangflowFormat(data: any): any {
    // Convert Langflow nodes to SynthralOS nodes
    const synthralNodes = (data.nodes || []).map((node: any) => {
      const synthralType = this.mapLangflowNodeType(node.type);
      
      return {
        id: node.id,
        type: synthralType,
        position: node.position,
        width: node.width,
        height: node.height,
        selected: node.selected || false,
        positionAbsolute: node.positionAbsolute,
        // Convert parameters to match SynthralOS format
        data: {
          ...node.data,
          label: node.data?.display_name || node.data?.node_id || node.id,
          description: node.data?.description || "",
          // Extract parameters from Langflow format
          parameters: this.extractParametersFromLangflowNode(node.data),
          // Store original type for reference
          originalType: node.type
        },
        style: node.style || {}
      };
    });
    
    // Convert Langflow edges to SynthralOS edges
    const synthralEdges = (data.edges || []).map((edge: any) => {
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type || 'default',
        animated: edge.animated || false,
        style: edge.style || {}
      };
    });
    
    // Return complete SynthralOS workflow
    return {
      nodes: synthralNodes,
      edges: synthralEdges,
      viewport: data.viewport,
      description: data.description,
      name: data.name
    };
  }

  /**
   * Extract parameters from a Langflow node data
   */
  private extractParametersFromLangflowNode(nodeData: any): Record<string, any> {
    // Handle Langflow's parameter structure which can be nested
    if (!nodeData) return {};
    
    const parameters: Record<string, any> = {};
    
    // Extract parameters from the parameters property
    if (nodeData.parameters && typeof nodeData.parameters === 'object') {
      Object.entries(nodeData.parameters).forEach(([key, value]) => {
        parameters[key] = value;
      });
    }
    
    // Extract any template variables
    if (nodeData.template && typeof nodeData.template === 'object') {
      Object.entries(nodeData.template).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object' && 'value' in value) {
          parameters[key] = value.value;
        }
      });
    }
    
    return parameters;
  }

  /**
   * Get a template for a Langflow node type
   */
  private getLangflowNodeTemplate(nodeType: string): any {
    // Base templates for different node types in Langflow
    const templates: Record<string, any> = {
      // LLM Nodes
      'ChatOpenAI': {
        data: {
          display_name: 'ChatOpenAI',
          description: 'OpenAI Chat Model',
          parameters: {
            model_name: 'gpt-4o',
            temperature: 0.7,
            max_tokens: 256
          },
          template: {
            model_name: { value: 'gpt-4o' },
            temperature: { value: 0.7 },
            max_tokens: { value: 256 }
          }
        },
        style: {
          background: '#FFF5E0',
          color: '#000',
          border: '1px solid #FF9500',
          borderRadius: '4px'
        }
      },
      'ChatAnthropic': {
        data: {
          display_name: 'ChatAnthropic',
          description: 'Anthropic Claude Chat Model',
          parameters: {
            model_name: 'claude-3-7-sonnet-20250219',
            temperature: 0.7,
            max_tokens: 1024
          },
          template: {
            model_name: { value: 'claude-3-7-sonnet-20250219' },
            temperature: { value: 0.7 },
            max_tokens: { value: 1024 }
          }
        },
        style: {
          background: '#F0F0FF',
          color: '#000',
          border: '1px solid #9370DB',
          borderRadius: '4px'
        }
      },
      
      // Chain Nodes
      'LLMChain': {
        data: {
          display_name: 'LLM Chain',
          description: 'Chain to run queries against LLMs',
          parameters: {
            verbose: true
          },
          template: {
            verbose: { value: true }
          }
        },
        style: {
          background: '#E8F4FD',
          color: '#000',
          border: '1px solid #0096FF',
          borderRadius: '4px'
        }
      },
      
      // Prompt Nodes
      'PromptTemplate': {
        data: {
          display_name: 'Prompt Template',
          description: 'Template for generating prompts',
          parameters: {
            template: "You are a helpful assistant. Answer the following question:\n\n{question}",
            input_variables: ["question"]
          },
          template: {
            template: { 
              value: "You are a helpful assistant. Answer the following question:\n\n{question}" 
            },
            input_variables: { value: ["question"] }
          }
        },
        style: {
          background: '#F5FFE0',
          color: '#000',
          border: '1px solid #8BC34A',
          borderRadius: '4px'
        }
      },
      
      // Memory Nodes
      'BufferMemory': {
        data: {
          display_name: 'Buffer Memory',
          description: 'Memory for storing chat history',
          parameters: {
            memory_key: "chat_history",
            return_messages: true
          },
          template: {
            memory_key: { value: "chat_history" },
            return_messages: { value: true }
          }
        },
        style: {
          background: '#FFE0FB',
          color: '#000',
          border: '1px solid #E040FB',
          borderRadius: '4px'
        }
      },
      
      // Vector Store Nodes
      'VectorStoreNode': {
        data: {
          display_name: 'Vector Store',
          description: 'Store and retrieve vectors',
          parameters: {
            collection_name: "default",
            search_type: "similarity",
            k: 5
          },
          template: {
            collection_name: { value: "default" },
            search_type: { value: "similarity" },
            k: { value: 5 }
          }
        },
        style: {
          background: '#E0FFFF',
          color: '#000',
          border: '1px solid #00CED1',
          borderRadius: '4px'
        }
      },
      
      // Tool Nodes
      'Tool': {
        data: {
          display_name: 'Tool',
          description: 'Tool for an agent to use',
          parameters: {
            name: "search",
            description: "Useful for searching information"
          },
          template: {
            name: { value: "search" },
            description: { value: "Useful for searching information" }
          }
        },
        style: {
          background: '#FFE0E0',
          color: '#000',
          border: '1px solid #FF5252',
          borderRadius: '4px'
        }
      },
      
      // Agent Nodes
      'OpenAIFunctionsAgent': {
        data: {
          display_name: 'OpenAI Functions Agent',
          description: 'Agent that uses OpenAI function calling',
          parameters: {
            system_message: "You are a helpful assistant with access to tools."
          },
          template: {
            system_message: { 
              value: "You are a helpful assistant with access to tools." 
            }
          }
        },
        style: {
          background: '#E6F7FF',
          color: '#000',
          border: '1px solid #1890FF',
          borderRadius: '4px'
        }
      },
      
      // Default node
      'default': {
        data: {
          display_name: 'Custom Node',
          description: 'Custom node type',
          parameters: {}
        },
        style: {
          background: '#F5F5F5',
          color: '#000',
          border: '1px solid #999',
          borderRadius: '4px'
        }
      }
    };
    
    // Return the template for the node type, or default if not found
    return templates[nodeType] || templates.default;
  }

  /**
   * Map SynthralOS node type to Langflow node type
   */
  private mapNodeTypeToLangflow(nodeType: string): string {
    // Extended mapping with more node types
    const nodeTypeMap: Record<string, string> = {
      // Input/Output
      'input': 'InputNode',
      'output': 'OutputNode',
      
      // LLM Models
      'llm': 'ChatOpenAI',
      'openai': 'ChatOpenAI',
      'claude': 'ChatAnthropic',
      'anthropic': 'ChatAnthropic',
      'mistral': 'ChatMistral',
      'llama': 'ChatOllama',
      'gemini': 'ChatGoogleGenerativeAI',
      'perplexity': 'ChatPerplexity',
      'cohere': 'ChatCohere',
      'groq': 'ChatGroq',
      
      // Chains
      'chain': 'LLMChain',
      'sequentialChain': 'SequentialChain',
      'routerChain': 'RouterChain',
      'retrievalChain': 'RetrievalQAChain',
      'summarizationChain': 'SummarizeChain',
      'qaChain': 'QAChain',
      'ragChain': 'RagChain',
      'mapReduceChain': 'MapReduceChain',
      'refineChain': 'RefineChain',
      'conversationalChain': 'ConversationalRetrievalChain',
      'sqlChain': 'SqlDatabaseChain',
      'apiChain': 'APIChain',
      
      // Agents
      'agent': 'OpenAIFunctionsAgent',
      'conversationalAgent': 'ConversationalAgent',
      'reactAgent': 'ReActAgent',
      'planAndExecuteAgent': 'PlanAndExecuteAgent',
      'toolAgent': 'ToolCallingAgent',
      'xmlAgent': 'XMLAgent',
      'multiAgentOrchestrator': 'MultiAgentOrchestrator',
      'jsonAgent': 'JSONAgent',
      'creativeAgent': 'CreativeAgent',
      'autogptAgent': 'AutoGPTAgent',
      'babyagiAgent': 'BabyAGIAgent',
      'crewAIAgent': 'CrewAIAgent',
      
      // Memory
      'memory': 'BufferMemory',
      'conversationMemory': 'ConversationBufferMemory',
      'summaryMemory': 'ConversationSummaryMemory',
      'vectorMemory': 'VectorStoreMemory',
      'windowMemory': 'ConversationBufferWindowMemory',
      'entityMemory': 'EntityMemory',
      'zepMemory': 'ZepMemory',
      'motifMemory': 'MotifMemory',
      'graphMemory': 'GraphMemory',
      'postgresMemory': 'PostgresMemory',
      'redisMemory': 'RedisMemory',
      
      // Tools
      'tool': 'Tool',
      'searchTool': 'SearchTool',
      'calculatorTool': 'CalculatorTool',
      'webBrowserTool': 'WebBrowserTool',
      'wolframAlphaTool': 'WolframAlphaTool',
      'databaseTool': 'SQLDatabaseTool',
      'apiTool': 'APITool',
      'pythonTool': 'PythonREPLTool',
      'fileToolkit': 'FileManagementToolkit',
      'slackTool': 'SlackTool',
      'zapierTool': 'ZapierNLATool',
      'shellTool': 'ShellTool',
      'githubTool': 'GitHubSearchTool',
      'googleToolkit': 'GoogleSearchToolkit',
      'playWrightTool': 'PlayWrightBrowserTool',
      'puppeteerTool': 'PuppeteerTool',
      'makeToolkit': 'HumanInputToolkit',
      
      // Prompts
      'promptTemplate': 'PromptTemplate',
      'chatPromptTemplate': 'ChatPromptTemplate',
      'systemMessage': 'SystemMessagePromptTemplate',
      'humanMessage': 'HumanMessagePromptTemplate',
      'messagesPlaceholder': 'MessagesPlaceholder',
      'aiMessage': 'AIMessagePromptTemplate',
      'fewShotPromptTemplate': 'FewShotPromptTemplate',
      'toolMessage': 'ToolMessagePromptTemplate',
      
      // Vector Stores
      'vectorStore': 'VectorStoreNode',
      'pgvector': 'PGVectorStore',
      'chroma': 'ChromaStore',
      'pinecone': 'PineconeStore',
      'supavec': 'SupavecStore',
      'qdrant': 'QdrantVectorStore',
      'weaviate': 'WeaviateStore',
      'faiss': 'FaissStore',
      'milvus': 'MilvusStore',
      'redisVector': 'RedisVectorStore',
      
      // Document Processing
      'textSplitter': 'RecursiveCharacterTextSplitter',
      'documentLoader': 'TextLoader',
      'pdfLoader': 'PDFLoader',
      'webLoader': 'WebLoader',
      'csvLoader': 'CSVLoader',
      'jsonLoader': 'JSONLoader',
      'htmlLoader': 'HTMLLoader',
      'markdownLoader': 'MarkdownLoader',
      'sitemapLoader': 'SitemapLoader',
      'documentCompressor': 'DocumentCompressor',
      'documentTransformer': 'DocumentTransformer',
      
      // Retrievers
      'retriever': 'VectorStoreRetriever',
      'contextualRetriever': 'ContextualCompressor',
      'hybridRetriever': 'HybridRetriever',
      'multiQueryRetriever': 'MultiQueryRetriever',
      'parentDocumentRetriever': 'ParentDocumentRetriever',
      'selfQueryRetriever': 'SelfQueryRetriever',
      'ensembleRetriever': 'EnsembleRetriever',
      'timeWeightedRetriever': 'TimeWeightedRetriever',
      
      // Parsers
      'parser': 'OutputParser',
      'structuredParser': 'StructuredOutputParser',
      'jsonParser': 'JsonOutputParser',
      'xmlParser': 'XMLOutputParser',
      'pydanticParser': 'PydanticOutputParser',
      'promptLayerParser': 'PromptLayerOutputParser',
      
      // External Integrations
      'slack': 'SlackIntegration',
      'zapier': 'ZapierIntegration',
      'github': 'GitHubIntegration',
      'notion': 'NotionIntegration',
      'airtable': 'AirtableIntegration',
      'googleDrive': 'GoogleDriveIntegration',
      'gmail': 'GmailIntegration',
      'discord': 'DiscordIntegration',
      'trello': 'TrelloIntegration',
      'hubspot': 'HubspotIntegration',
      'salesforce': 'SalesforceIntegration',
      'zendesk': 'ZendeskIntegration',
      
      // Observability
      'langfuse': 'LangfuseTracer',
      'llamaindex': 'LlamaIndexNode',
      'posthog': 'PosthogTracker',
      'opentelemetry': 'OpenTelemetryTracer',
      'signoz': 'SignozMonitor',
      'weightsAndBiases': 'WandbMonitor'
    };
    
    return nodeTypeMap[nodeType] || 'CustomNode';
  }

  /**
   * Map Langflow node type to SynthralOS node type
   */
  private mapLangflowNodeType(nodeType: string): string {
    // Extended reverse mapping
    const nodeTypeMap: Record<string, string> = {
      // Input/Output
      'InputNode': 'input',
      'OutputNode': 'output',
      
      // LLM Models
      'ChatOpenAI': 'openai',
      'OpenAI': 'openai',
      'ChatAnthropic': 'anthropic',
      'Anthropic': 'anthropic',
      'ChatMistral': 'mistral',
      'ChatOllama': 'llama',
      'ChatGoogleGenerativeAI': 'gemini',
      'ChatPerplexity': 'perplexity',
      'ChatCohere': 'cohere',
      'ChatGroq': 'groq',
      
      // Chains
      'LLMChain': 'chain',
      'SequentialChain': 'sequentialChain',
      'RouterChain': 'routerChain',
      'RetrievalQAChain': 'retrievalChain',
      'SummarizeChain': 'summarizationChain',
      'QAChain': 'qaChain',
      'RagChain': 'ragChain',
      'MapReduceChain': 'mapReduceChain',
      'RefineChain': 'refineChain',
      'ConversationalRetrievalChain': 'conversationalChain',
      'SqlDatabaseChain': 'sqlChain',
      'APIChain': 'apiChain',
      
      // Agents
      'OpenAIFunctionsAgent': 'agent',
      'ConversationalAgent': 'conversationalAgent',
      'ReActAgent': 'reactAgent',
      'PlanAndExecuteAgent': 'planAndExecuteAgent',
      'ToolCallingAgent': 'toolAgent',
      'XMLAgent': 'xmlAgent',
      'MultiAgentOrchestrator': 'multiAgentOrchestrator',
      'JSONAgent': 'jsonAgent',
      'CreativeAgent': 'creativeAgent',
      'AutoGPTAgent': 'autogptAgent',
      'BabyAGIAgent': 'babyagiAgent',
      'CrewAIAgent': 'crewAIAgent',
      
      // Memory
      'BufferMemory': 'memory',
      'ConversationBufferMemory': 'conversationMemory',
      'ConversationSummaryMemory': 'summaryMemory',
      'VectorStoreMemory': 'vectorMemory',
      'ConversationBufferWindowMemory': 'windowMemory',
      'EntityMemory': 'entityMemory',
      'ZepMemory': 'zepMemory',
      'MotifMemory': 'motifMemory',
      'GraphMemory': 'graphMemory',
      'PostgresMemory': 'postgresMemory',
      'RedisMemory': 'redisMemory',
      
      // Tools
      'Tool': 'tool',
      'SearchTool': 'searchTool',
      'CalculatorTool': 'calculatorTool',
      'WebBrowserTool': 'webBrowserTool',
      'WolframAlphaTool': 'wolframAlphaTool',
      'SQLDatabaseTool': 'databaseTool',
      'APITool': 'apiTool',
      'PythonREPLTool': 'pythonTool',
      'FileManagementToolkit': 'fileToolkit',
      'SlackTool': 'slackTool',
      'ZapierNLATool': 'zapierTool',
      'ShellTool': 'shellTool',
      'GitHubSearchTool': 'githubTool',
      'GoogleSearchToolkit': 'googleToolkit',
      'PlayWrightBrowserTool': 'playWrightTool',
      'PuppeteerTool': 'puppeteerTool',
      'HumanInputToolkit': 'makeToolkit',
      
      // Prompts
      'PromptTemplate': 'promptTemplate',
      'ChatPromptTemplate': 'chatPromptTemplate',
      'SystemMessagePromptTemplate': 'systemMessage',
      'HumanMessagePromptTemplate': 'humanMessage',
      'MessagesPlaceholder': 'messagesPlaceholder',
      'AIMessagePromptTemplate': 'aiMessage',
      'FewShotPromptTemplate': 'fewShotPromptTemplate',
      'ToolMessagePromptTemplate': 'toolMessage',
      
      // Vector Stores
      'VectorStoreNode': 'vectorStore',
      'PGVectorStore': 'pgvector',
      'ChromaStore': 'chroma',
      'PineconeStore': 'pinecone',
      'SupavecStore': 'supavec',
      'QdrantVectorStore': 'qdrant',
      'WeaviateStore': 'weaviate',
      'FaissStore': 'faiss',
      'MilvusStore': 'milvus',
      'RedisVectorStore': 'redis',
      
      // Document Processing
      'RecursiveCharacterTextSplitter': 'textSplitter',
      'TextLoader': 'documentLoader',
      'PDFLoader': 'pdfLoader',
      'WebLoader': 'webLoader',
      'CSVLoader': 'csvLoader',
      'JSONLoader': 'jsonLoader',
      'HTMLLoader': 'htmlLoader',
      'MarkdownLoader': 'markdownLoader',
      'SitemapLoader': 'sitemapLoader',
      'DocumentCompressor': 'documentCompressor',
      'DocumentTransformer': 'documentTransformer',
      
      // Retrievers
      'VectorStoreRetriever': 'retriever',
      'ContextualCompressor': 'contextualRetriever',
      'HybridRetriever': 'hybridRetriever',
      'MultiQueryRetriever': 'multiQueryRetriever',
      'ParentDocumentRetriever': 'parentDocumentRetriever',
      'SelfQueryRetriever': 'selfQueryRetriever',
      'EnsembleRetriever': 'ensembleRetriever',
      'TimeWeightedRetriever': 'timeWeightedRetriever',
      
      // Parsers
      'OutputParser': 'parser',
      'StructuredOutputParser': 'structuredParser',
      'JsonOutputParser': 'jsonParser',
      'XMLOutputParser': 'xmlParser',
      'PydanticOutputParser': 'pydanticParser',
      'PromptLayerOutputParser': 'promptLayerParser',
      
      // External Integrations
      'SlackIntegration': 'slack',
      'ZapierIntegration': 'zapier',
      'GitHubIntegration': 'github',
      'NotionIntegration': 'notion',
      'AirtableIntegration': 'airtable',
      'GoogleDriveIntegration': 'googleDrive',
      'GmailIntegration': 'gmail',
      'DiscordIntegration': 'discord',
      'TrelloIntegration': 'trello',
      'HubspotIntegration': 'hubspot',
      'SalesforceIntegration': 'salesforce',
      'ZendeskIntegration': 'zendesk',
      
      // Observability
      'LangfuseTracer': 'langfuse',
      'LlamaIndexNode': 'llamaindex',
      'PosthogTracker': 'posthog',
      'OpenTelemetryTracer': 'opentelemetry',
      'SignozMonitor': 'signoz',
      'WandbMonitor': 'weightsAndBiases'
    };
    
    return nodeTypeMap[nodeType] || 'custom';
  }
}

// Export an instance for direct use
export const langflowService = new LangflowService();