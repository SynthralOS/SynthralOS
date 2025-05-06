import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { AppLayout } from '@/layouts/AppLayout';
import { BackButton } from '@/components/BackButton';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentStrengthSelector from '@/components/agent/AgentStrengthSelector';

// Define protocol type
interface Protocol {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
}

// Define API keys response type
interface ApiKeyResponse {
  status: string;
  providers: {
    [key: string]: boolean;
  };
  missing: string[];
}

// Define tool parameter type
interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

// Define tool type
interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

// Define API responses
interface ProtocolsResponse {
  protocols: Protocol[];
}

interface ToolsResponse {
  tools: Tool[];
}

// Define form schema
const agentTaskSchema = z.object({
  task: z.string().min(3, "Task description must be at least 3 characters"),
  protocol: z.string().optional(),
  tools: z.array(z.string()).optional(),
});

type AgentTaskFormValues = z.infer<typeof agentTaskSchema>;

export default function AgentProtocolsPage() {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("standard");
  
  // Direct state management for protocols and tools
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [apiKeysStatus, setApiKeysStatus] = useState<any>(null);
  const [isLoadingProtocols, setIsLoadingProtocols] = useState(true);
  const [isLoadingTools, setIsLoadingTools] = useState(true);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(true);
  const [protocolsError, setProtocolsError] = useState<Error | null>(null);
  const [toolsError, setToolsError] = useState<Error | null>(null);
  const [apiKeysError, setApiKeysError] = useState<Error | null>(null);
  
  // Fetch protocols directly
  useEffect(() => {
    const fetchProtocols = async () => {
      try {
        setIsLoadingProtocols(true);
        const response = await fetch('/api/agent/protocols');
        const data = await response.json();
        console.log('Protocols data:', data);
        
        if (data && Array.isArray(data.protocols)) {
          setProtocols(data.protocols);
        }
      } catch (err) {
        console.error('Error fetching protocols:', err);
        setProtocolsError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoadingProtocols(false);
      }
    };
    fetchProtocols();
  }, []);
  
  // Fetch tools directly
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setIsLoadingTools(true);
        const response = await fetch('/api/agent/tools');
        const data = await response.json();
        console.log('Tools data:', data);
        
        if (data && Array.isArray(data.tools)) {
          setTools(data.tools);
        }
      } catch (err) {
        console.error('Error fetching tools:', err);
        setToolsError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoadingTools(false);
      }
    };
    fetchTools();
  }, []);
  
  // Fetch API keys status directly
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        setIsLoadingApiKeys(true);
        const response = await fetch('/api/agent/api-keys');
        const data = await response.json();
        console.log('API keys data:', data);
        setApiKeysStatus(data);
      } catch (err) {
        console.error('Error fetching API keys:', err);
        setApiKeysError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoadingApiKeys(false);
      }
    };
    fetchApiKeys();
  }, []);
  
  // Debug logs
  useEffect(() => {
    console.log('Protocols length:', protocols.length);
    console.log('Tools length:', tools.length);
  }, [protocols, tools]);
  
  const form = useForm<AgentTaskFormValues>({
    resolver: zodResolver(agentTaskSchema),
    defaultValues: {
      task: '',
      protocol: '',
      tools: [],
    },
  });
  
  const onSubmit = async (values: AgentTaskFormValues) => {
    try {
      setIsExecuting(true);
      setResult(null);
      
      const response = await apiRequest('POST', '/api/agent/execute', values);
      const data = await response.json();
      
      setResult(data);
      
      // Check if the response contains an error
      if (data.error) {
        toast({
          title: "Execution Error",
          description: data.error || "An error occurred during execution",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Task Executed",
          description: "Agent has completed the task",
        });
      }
    } catch (error) {
      console.error("Error executing task:", error);
      toast({
        title: "Request Error",
        description: error instanceof Error ? error.message : "Failed to execute task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };
  
  return (
    <div className="container mx-auto flex flex-col gap-6 p-4 md:p-8 pb-24">
      <div className="flex items-center gap-4 mb-2">
        <BackButton />
        <PageHeader
          heading="Agent Protocols"
          subheading="Execute tasks using different agent protocols and tool combinations"
        />
      </div>
      
      {/* API Key Status */}
      {isLoadingApiKeys ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API Key Status</CardTitle>
            <CardDescription>Checking API key configuration...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-[100px]">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      ) : apiKeysStatus ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API Key Status</CardTitle>
            <CardDescription>Check if required API keys are configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="font-medium">Status:</div>
                <div>
                  {apiKeysStatus.status === 'ok' ? (
                    <Badge className="bg-green-500">All keys configured</Badge>
                  ) : (
                    <Badge variant="destructive">Missing keys</Badge>
                  )}
                </div>
              </div>
              
              {apiKeysStatus.missing && apiKeysStatus.missing.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium">Missing keys:</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {apiKeysStatus.missing.map((key: string, idx: number) => (
                      <Badge key={`${key}-${idx}`} variant="outline" className="text-red-500 border-red-500">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-2">
                <div className="font-medium">Providers:</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(apiKeysStatus.providers || {}).map(([provider, isConfigured], idx) => (
                    <Badge 
                      key={`${provider}-${idx}`} 
                      variant="outline" 
                      className={isConfigured ? "text-green-500 border-green-500" : "text-red-500 border-red-500"}
                    >
                      {provider}: {isConfigured ? "✓" : "✗"}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API Key Status</CardTitle>
            <CardDescription>Error loading API key information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground">
              <p>Could not load API key status. Please refresh the page to try again.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Agent Selection Tabs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Agent Protocol</CardTitle>
          <CardDescription>Choose the best agent protocol for your task</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="standard">Standard Selection</TabsTrigger>
              <TabsTrigger value="by-strength">Selection by Strength</TabsTrigger>
            </TabsList>
            
            <TabsContent value="standard">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Execute Task Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Execute Task</CardTitle>
                    <CardDescription>Define a task and choose agent protocol</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="task"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Task Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the task to be executed..." 
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Clearly describe what you want the agent to accomplish
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="protocol"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agent Protocol</FormLabel>
                              <Select 
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a protocol (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="auto">Auto-select protocol</SelectItem>
                                  {protocols.map((protocol) => (
                                    <SelectItem key={protocol.name} value={protocol.name}>
                                      {protocol.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The system will auto-select the best protocol if none is chosen
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          disabled={isExecuting || (apiKeysStatus?.missing && apiKeysStatus.missing.length > 0)}
                          className="w-full"
                        >
                          {isExecuting ? "Executing..." : "Execute Task"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                {/* Result Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Result</CardTitle>
                    <CardDescription>Output from the agent execution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isExecuting ? (
                      <div className="flex justify-center items-center h-[200px]">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : result ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Protocol</h4>
                          <p className="mt-1">{result.protocol}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Response</h4>
                          <div className="mt-1 whitespace-pre-wrap p-4 bg-gray-50 rounded-md text-sm">
                            {typeof result.response === 'object' && result.response.content
                              ? (typeof result.response.content === 'string' 
                                  ? result.response.content.replace(/\\n/g, '\n') 
                                  : JSON.stringify(result.response.content, null, 2))
                              : typeof result.response === 'string'
                                ? result.response
                                : JSON.stringify(result.response, null, 2)}
                          </div>
                        </div>
                        
                        {result.metadata && (
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground">Execution Time</h4>
                            <p className="mt-1">{result.executionTime}ms</p>
                          </div>
                        )}
                        
                        {result.response && typeof result.response === 'object' && result.response.toolCalls?.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground">Tool Calls</h4>
                            <div className="mt-1 space-y-2">
                              {result.response.toolCalls.map((tool: any, idx: number) => (
                                <div key={idx} className="border rounded p-2">
                                  <p className="font-medium">{tool.name}</p>
                                  <pre className="text-xs bg-muted p-1 mt-1 rounded overflow-auto">
                                    {JSON.stringify(tool.input, null, 2)}
                                  </pre>
                                  {tool.output && (
                                    <pre className="text-xs bg-muted p-1 mt-1 rounded overflow-auto">
                                      {JSON.stringify(tool.output, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Show raw response for debugging */}
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium text-sm text-muted-foreground">Raw Response Data</h4>
                          <pre className="text-xs bg-muted p-2 mt-1 rounded overflow-auto max-h-40">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground h-[200px] flex items-center justify-center">
                        <p>Execute a task to see results here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="by-strength">
              <AgentStrengthSelector 
                onSelect={(protocol) => {
                  form.setValue("protocol", protocol);
                  setActiveTab("standard");
                  toast({
                    title: "Protocol Selected",
                    description: `Selected the ${protocol} protocol for your task`,
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Protocols Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Available Protocols ({protocols.length})</CardTitle>
          <CardDescription>Choose the best agent protocol for your task</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProtocols ? (
            <div className="flex justify-center items-center h-[200px]">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : protocols.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {protocols.map((protocol, index) => (
                <div key={`${protocol.name}-${index}`} className="border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{protocol.name}</h3>
                    <Badge variant="outline">{protocol.version}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">{protocol.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {protocol.capabilities && protocol.capabilities.map((cap, i) => (
                      <Badge key={i} variant="secondary">{cap}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground h-[200px] flex items-center justify-center">
              <p>No protocols available or error loading protocols</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tools Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Available Tools ({tools.length})</CardTitle>
          <CardDescription>Tools that can be utilized by the agents</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTools ? (
            <div className="flex justify-center items-center h-[200px]">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : tools.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {tools.map((tool, index) => (
                <AccordionItem key={`${tool.name}-${index}`} value={tool.name}>
                  <AccordionTrigger className="text-base">
                    {tool.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-2 space-y-3">
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                      
                      <div className="mt-2">
                        <h4 className="text-sm font-medium">Parameters:</h4>
                        <div className="grid grid-cols-1 gap-2 mt-1">
                          {Array.isArray(tool.parameters) && tool.parameters.map((param, pIdx) => (
                            <div key={`${param.name}-${pIdx}`} className="border rounded p-2">
                              <div className="flex items-center">
                                <span className="font-medium">{param.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {param.type}
                                </Badge>
                                {param.required && (
                                  <Badge className="ml-2 text-xs bg-red-500">required</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {param.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground h-[200px] flex items-center justify-center">
              <p>No tools available or error loading tools</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}