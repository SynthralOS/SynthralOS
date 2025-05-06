import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Tabs, TabsList, TabsTrigger, TabsContent 
} from '@/components/ui/tabs';
import { 
  Card, CardContent, CardDescription, CardFooter,
  CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Alert, AlertTitle, AlertDescription
} from '@/components/ui/alert';
// Import the LangChain tester component
import LangChainTester from '@/components/langchain/LangChainTester';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  CircleCheck,
  CircleX,
  RefreshCw,
  Bot,
  Settings,
  Search,
  ChevronRight,
  PenSquare,
  BrainCircuit,
  SparklesIcon,
  MessagesSquare
} from 'lucide-react';

interface LangChainStatusResponse {
  status: 'operational' | 'error';
  version: string;
  initialized: boolean;
  modelAvailability: {
    openai: 'available' | 'unavailable';
    anthropic: 'available' | 'unavailable';
  };
  features: {
    chains: boolean;
    agents: boolean;
    retrieval: boolean;
    memory: boolean;
  };
}

interface ChainInput {
  promptTemplate: string;
  input: string;
  options?: Record<string, any>;
}

interface RetrievalInput {
  collectionId: number;
  promptTemplate: string;
  query: string;
  options?: Record<string, any>;
}

interface AgentInput {
  systemMessage: string;
  tools: string[];
  query: string;
  options?: Record<string, any>;
}

interface ChainOutput {
  result: string;
  totalTokens?: number;
  timeTaken?: number;
}

// The main interface component for the LangChain page
const LangchainInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chains');
  const { toast } = useToast();
  
  // Chain states
  const [chainInput, setChainInput] = useState({
    promptTemplate: 'You are a helpful assistant. Answer the following question:\n\n{input}',
    input: '',
    options: {}
  });
  
  // Retrieval states
  const [retrievalInput, setRetrievalInput] = useState({
    collectionId: 1,
    promptTemplate: 'You are a helpful assistant. Use the following context to answer the question.\n\nContext: {context}\n\nQuestion: {query}',
    query: '',
    options: {}
  });
  
  // Agent states
  const [agentInput, setAgentInput] = useState({
    systemMessage: 'You are a helpful assistant with access to tools. Use them to help answer the user\'s question.',
    tools: ['web-search', 'calculator'],
    query: '',
    options: {}
  });
  
  // Output states
  const [chainOutput, setChainOutput] = useState<ChainOutput | null>(null);
  const [retrievalOutput, setRetrievalOutput] = useState<ChainOutput | null>(null);
  const [agentOutput, setAgentOutput] = useState<ChainOutput | null>(null);
  
  // Get LangChain status
  const { 
    data: langchainStatus, 
    isLoading: isLoadingStatus, 
    error: statusError,
    refetch: refetchStatus 
  } = useQuery<LangChainStatusResponse>({ 
    queryKey: ['/api/langchain/status'],
    retry: false,
  });
  
  // Collections for retrieval
  const { 
    data: collections = [], 
    isLoading: isLoadingCollections
  } = useQuery<any[]>({ 
    queryKey: ['/api/vector-db/collections'],
    retry: false,
    enabled: activeTab === 'retrieval'
  });
  
  // Tool definitions
  const { 
    data: availableTools = [], 
    isLoading: isLoadingTools
  } = useQuery<any[]>({ 
    queryKey: ['/api/langchain/tools'],
    retry: false,
    enabled: activeTab === 'agents'
  });
  
  // Execute chain mutation
  const executeChainMutation = useMutation({
    mutationFn: async (input: ChainInput) => {
      const response = await apiRequest('POST', '/api/langchain/chain', input);
      return response.json();
    },
    onSuccess: (data) => {
      setChainOutput(data);
      toast({
        title: 'Chain executed successfully',
        description: 'The LLM chain has been executed and returned a result.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error executing chain',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Execute retrieval mutation
  const executeRetrievalMutation = useMutation({
    mutationFn: async (input: RetrievalInput) => {
      const response = await apiRequest('POST', '/api/langchain/retrieval', input);
      return response.json();
    },
    onSuccess: (data) => {
      setRetrievalOutput(data);
      toast({
        title: 'Retrieval chain executed successfully',
        description: 'The retrieval-augmented chain has been executed and returned a result.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error executing retrieval chain',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Execute agent mutation
  const executeAgentMutation = useMutation({
    mutationFn: async (input: AgentInput) => {
      const response = await apiRequest('POST', '/api/langchain/agent', input);
      return response.json();
    },
    onSuccess: (data) => {
      setAgentOutput(data);
      toast({
        title: 'Agent executed successfully',
        description: 'The LLM agent has been executed and returned a result.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error executing agent',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submissions
  const handleChainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeChainMutation.mutate(chainInput);
  };
  
  const handleRetrievalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeRetrievalMutation.mutate(retrievalInput);
  };
  
  const handleAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAgentMutation.mutate(agentInput);
  };
  
  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">LangChain Integration</h1>
        <p className="text-muted-foreground">
          Build advanced AI workflows with the LangChain integration
        </p>
      </div>
      
      {/* Status card */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <BrainCircuit className="h-5 w-5 mr-2" />
            LangChain Status
          </CardTitle>
          <CardDescription>
            Service and model availability for LangChain integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStatus ? (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="h-6 w-6 mr-2 animate-spin text-primary" />
              <span>Checking LangChain service status...</span>
            </div>
          ) : statusError ? (
            <Alert variant="destructive">
              <CircleX className="h-5 w-5" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                Could not connect to the LangChain service. Please try again later.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert variant={langchainStatus?.status === 'operational' ? 'default' : 'destructive'}>
                {langchainStatus?.status === 'operational' ? (
                  <CircleCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <CircleX className="h-5 w-5" />
                )}
                <AlertTitle>
                  {langchainStatus?.status === 'operational' ? 'Operational' : 'Service Error'}
                </AlertTitle>
                <AlertDescription>
                  {langchainStatus?.status === 'operational' 
                    ? `LangChain service is running properly (${langchainStatus.version})`
                    : 'LangChain service is currently experiencing issues.'
                  }
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Model Availability</h3>
                  <div className="flex items-center mt-1">
                    <div className={`w-3 h-3 rounded-full mr-2 ${langchainStatus?.modelAvailability.openai === 'available' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    <span className="mr-1 font-medium">OpenAI:</span>
                    <span>{langchainStatus?.modelAvailability.openai}</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${langchainStatus?.modelAvailability.anthropic === 'available' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    <span className="mr-1 font-medium">Anthropic:</span>
                    <span>{langchainStatus?.modelAvailability.anthropic}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Features</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${langchainStatus?.features.chains ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      <span>Chains</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${langchainStatus?.features.agents ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      <span>Agents</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${langchainStatus?.features.retrieval ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      <span>Retrieval</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${langchainStatus?.features.memory ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      <span>Memory</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={() => refetchStatus()} disabled={isLoadingStatus}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardFooter>
      </Card>
      
      {/* Feature tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chains" className="flex items-center space-x-1">
            <PenSquare className="h-4 w-4 mr-1" />
            <span>LLM Chains</span>
          </TabsTrigger>
          <TabsTrigger value="retrieval" className="flex items-center space-x-1">
            <Search className="h-4 w-4 mr-1" />
            <span>Retrieval</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center space-x-1">
            <Bot className="h-4 w-4 mr-1" />
            <span>Agents</span>
          </TabsTrigger>
        </TabsList>
        
        {/* LLM Chains Tab */}
        <TabsContent value="chains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LLM Chain</CardTitle>
              <CardDescription>
                Create a simple chain between a prompt template and an LLM model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChainSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="promptTemplate">Prompt Template</Label>
                  <Textarea
                    id="promptTemplate"
                    rows={4}
                    placeholder="Enter your prompt template with {input} placeholder"
                    value={chainInput.promptTemplate}
                    onChange={(e) => setChainInput({...chainInput, promptTemplate: e.target.value})}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{input}'} as placeholder for user input in your template
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chainInput">User Input</Label>
                  <Textarea
                    id="chainInput"
                    rows={3}
                    placeholder="Enter the user input or question"
                    value={chainInput.input}
                    onChange={(e) => setChainInput({...chainInput, input: e.target.value})}
                  />
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="advanced">
                    <AccordionTrigger className="text-sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced Options
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="temperature">Temperature</Label>
                            <Input
                              id="temperature"
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              placeholder="0.7"
                              onChange={(e) => setChainInput({
                                ...chainInput,
                                options: {
                                  ...chainInput.options,
                                  temperature: parseFloat(e.target.value)
                                }
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="maxTokens">Max Tokens</Label>
                            <Input
                              id="maxTokens"
                              type="number"
                              min="1"
                              placeholder="1024"
                              onChange={(e) => setChainInput({
                                ...chainInput,
                                options: {
                                  ...chainInput.options,
                                  max_tokens: parseInt(e.target.value)
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={executeChainMutation.isPending || !chainInput.input.trim()}
                    className="w-full md:w-auto"
                  >
                    {executeChainMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Executing Chain...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        Execute Chain
                      </>
                    )}
                  </Button>
                </div>
              </form>
              
              {/* Chain output */}
              {chainOutput && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium mb-2">Chain Output</h3>
                  <div className="p-4 bg-card/50 border rounded-md whitespace-pre-wrap">
                    {chainOutput.result}
                  </div>
                  
                  {(chainOutput.totalTokens !== undefined || chainOutput.timeTaken !== undefined) && (
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      {chainOutput.totalTokens !== undefined && (
                        <div>Tokens used: {chainOutput.totalTokens}</div>
                      )}
                      {chainOutput.timeTaken !== undefined && (
                        <div>Time taken: {chainOutput.timeTaken.toFixed(2)}s</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Chain Testing</CardTitle>
              <CardDescription>
                Test your chains with different inputs and models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LangChainTester type="chain" />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Retrieval Tab */}
        <TabsContent value="retrieval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Retrieval Augmented Generation</CardTitle>
              <CardDescription>
                Use retrieval augmented generation to answer questions based on your documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRetrievalSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="collection">Vector Collection</Label>
                  <Select 
                    value={String(retrievalInput.collectionId)} 
                    onValueChange={(value) => setRetrievalInput({
                      ...retrievalInput,
                      collectionId: parseInt(value)
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Collections</SelectLabel>
                        {isLoadingCollections ? (
                          <div className="flex items-center justify-center p-2">
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            <span>Loading collections...</span>
                          </div>
                        ) : collections.length === 0 ? (
                          <SelectItem value="0" disabled>No collections available</SelectItem>
                        ) : (
                          collections.map((collection: any) => (
                            <SelectItem key={collection.id} value={String(collection.id)}>
                              {collection.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ragPromptTemplate">Prompt Template</Label>
                  <Textarea
                    id="ragPromptTemplate"
                    rows={4}
                    placeholder="Enter your prompt template with {context} and {query} placeholders"
                    value={retrievalInput.promptTemplate}
                    onChange={(e) => setRetrievalInput({...retrievalInput, promptTemplate: e.target.value})}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{context}'} for retrieved documents and {'{query}'} for the user question
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="query">User Query</Label>
                  <Textarea
                    id="query"
                    rows={3}
                    placeholder="Enter the query to look up in the vector database"
                    value={retrievalInput.query}
                    onChange={(e) => setRetrievalInput({...retrievalInput, query: e.target.value})}
                  />
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="advanced">
                    <AccordionTrigger className="text-sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced Options
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ragTemperature">Temperature</Label>
                            <Input
                              id="ragTemperature"
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              placeholder="0.5"
                              onChange={(e) => setRetrievalInput({
                                ...retrievalInput,
                                options: {
                                  ...retrievalInput.options,
                                  temperature: parseFloat(e.target.value)
                                }
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="topK">Number of Documents</Label>
                            <Input
                              id="topK"
                              type="number"
                              min="1"
                              max="20"
                              placeholder="3"
                              onChange={(e) => setRetrievalInput({
                                ...retrievalInput,
                                options: {
                                  ...retrievalInput.options,
                                  top_k: parseInt(e.target.value)
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={executeRetrievalMutation.isPending || !retrievalInput.query.trim()}
                    className="w-full md:w-auto"
                  >
                    {executeRetrievalMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running Search...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search & Generate
                      </>
                    )}
                  </Button>
                </div>
              </form>
              
              {/* Retrieval output */}
              {retrievalOutput && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium mb-2">RAG Output</h3>
                  <div className="p-4 bg-card/50 border rounded-md whitespace-pre-wrap">
                    {retrievalOutput.result}
                  </div>
                  
                  {(retrievalOutput.totalTokens !== undefined || retrievalOutput.timeTaken !== undefined) && (
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      {retrievalOutput.totalTokens !== undefined && (
                        <div>Tokens used: {retrievalOutput.totalTokens}</div>
                      )}
                      {retrievalOutput.timeTaken !== undefined && (
                        <div>Time taken: {retrievalOutput.timeTaken.toFixed(2)}s</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Retrieval Testing</CardTitle>
              <CardDescription>
                Test different retrieval methods and vector stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LangChainTester type="retrieval" />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LLM Agent</CardTitle>
              <CardDescription>
                Create an agent with access to tools to solve complex tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAgentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systemMessage">System Message</Label>
                  <Textarea
                    id="systemMessage"
                    rows={3}
                    placeholder="Enter system message for the agent"
                    value={agentInput.systemMessage}
                    onChange={(e) => setAgentInput({...agentInput, systemMessage: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Available Tools</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {isLoadingTools ? (
                      <div className="col-span-3 flex items-center justify-center p-6">
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        <span>Loading tools...</span>
                      </div>
                    ) : (
                      availableTools.map((tool: any) => (
                        <div key={tool.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`tool-${tool.id}`}
                            checked={agentInput.tools.includes(tool.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAgentInput({
                                  ...agentInput,
                                  tools: [...agentInput.tools, tool.id]
                                });
                              } else {
                                setAgentInput({
                                  ...agentInput,
                                  tools: agentInput.tools.filter(t => t !== tool.id)
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor={`tool-${tool.id}`} className="text-sm">
                            {tool.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="query">User Query</Label>
                  <Textarea
                    id="query"
                    rows={3}
                    placeholder="Enter the task or question for the agent"
                    value={agentInput.query}
                    onChange={(e) => setAgentInput({...agentInput, query: e.target.value})}
                  />
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="advanced">
                    <AccordionTrigger className="text-sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced Options
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="agentTemperature">Temperature</Label>
                            <Input
                              id="agentTemperature"
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              placeholder="0.5"
                              onChange={(e) => setAgentInput({
                                ...agentInput,
                                options: {
                                  ...agentInput.options,
                                  temperature: parseFloat(e.target.value)
                                }
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="agentType">Agent Type</Label>
                            <Select 
                              onValueChange={(value) => setAgentInput({
                                ...agentInput,
                                options: {
                                  ...agentInput.options,
                                  agent_type: value
                                }
                              })}
                            >
                              <SelectTrigger id="agentType">
                                <SelectValue placeholder="Default" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="zero-shot-react">ReAct</SelectItem>
                                <SelectItem value="openai-functions">OpenAI Functions</SelectItem>
                                <SelectItem value="conversational">Conversational</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={executeAgentMutation.isPending || !agentInput.query.trim()}
                    className="w-full md:w-auto"
                  >
                    {executeAgentMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running Agent...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Run Agent
                      </>
                    )}
                  </Button>
                </div>
              </form>
              
              {/* Agent output */}
              {agentOutput && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium mb-2">Agent Output</h3>
                  <div className="p-4 bg-card/50 border rounded-md whitespace-pre-wrap">
                    {agentOutput.result}
                  </div>
                  
                  {(agentOutput.totalTokens !== undefined || agentOutput.timeTaken !== undefined) && (
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      {agentOutput.totalTokens !== undefined && (
                        <div>Tokens used: {agentOutput.totalTokens}</div>
                      )}
                      {agentOutput.timeTaken !== undefined && (
                        <div>Time taken: {agentOutput.timeTaken.toFixed(2)}s</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Agent Testing</CardTitle>
              <CardDescription>
                Test different agent architectures and tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LangChainTester type="agent" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Export as a named export for use when imported by other components
// This allows App.tsx to wrap it in AppLayout
function LangChainPage() {
  return <LangchainInterface />;
}

export default LangChainPage;