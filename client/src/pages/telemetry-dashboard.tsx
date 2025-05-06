import { useState, useEffect } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Activity, BarChart3, BookOpen, Check, Clock, Code, FileCode, FileJson, GitBranch, GitFork, GitPullRequest, Globe, Hash, Layers, Lock, Server, Shield, Sparkles, Zap } from 'lucide-react';

// Define types for telemetry services
interface TelemetryStatus {
  enabled: boolean;
  services: {
    openTelemetry: boolean;
    postHog: boolean;
    langfuse: boolean;
    stackStorm: boolean;
    archGW: boolean;
  };
}

interface ArchitectureComponent {
  id: string;
  name: string;
  type: string;
  description?: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

interface ArchitectureRule {
  id: string;
  name: string;
  type: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}

interface ValidationResult {
  valid: boolean;
  violations: {
    ruleId: string;
    componentId: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

interface Event {
  id: string;
  timestamp: string;
  name: string;
  userId: string;
  properties?: Record<string, any>;
}

export default function TelemetryDashboard() {
  const [traceName, setTraceName] = useState('');
  const [traceUserId, setTraceUserId] = useState('');
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentType, setNewComponentType] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [selectedTab, setSelectedTab] = useState('overview');
  const { toast } = useToast();

  // Fetch telemetry status
  const { 
    data: telemetryStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus
  } = useQuery<TelemetryStatus>({
    queryKey: ['/api/telemetry/status'],
    retry: false,
    enabled: true,
  });

  // Fetch architecture components
  const {
    data: components,
    isLoading: componentsLoading,
    refetch: refetchComponents
  } = useQuery<{ components: ArchitectureComponent[] }>({
    queryKey: ['/api/telemetry/arch/components'],
    retry: false,
    enabled: selectedTab === 'architecture',
  });

  // Fetch architecture rules
  const {
    data: rules,
    isLoading: rulesLoading,
    refetch: refetchRules
  } = useQuery<{ rules: ArchitectureRule[] }>({
    queryKey: ['/api/telemetry/arch/rules'],
    retry: false,
    enabled: selectedTab === 'architecture',
  });

  // Initialize OpenTelemetry mutation
  const initOpenTelemetryMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/telemetry/opentelemetry/init'),
    onSuccess: () => {
      toast({
        title: "OpenTelemetry Initialized",
        description: "Distributed tracing and metrics collection has been enabled",
      });
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Initialization Failed",
        description: "Could not initialize OpenTelemetry",
        variant: "destructive",
      });
    }
  });

  // Create Langfuse trace mutation
  const createTraceMutation = useMutation({
    mutationFn: () => {
      return apiRequest('POST', '/api/telemetry/langfuse/trace', {
        name: traceName,
        userId: traceUserId,
        metadata: { source: 'dashboard' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Trace Created",
        description: "New trace has been created in Langfuse",
      });
      setTraceName('');
      setTraceUserId('');
    },
    onError: (error) => {
      toast({
        title: "Trace Creation Failed",
        description: "Could not create Langfuse trace",
        variant: "destructive",
      });
    }
  });

  // Register component mutation
  const registerComponentMutation = useMutation({
    mutationFn: () => {
      const id = newComponentName.toLowerCase().replace(/\s+/g, '-');
      return apiRequest('POST', '/api/telemetry/arch/components', {
        id,
        name: newComponentName,
        type: newComponentType,
        description: `${newComponentType} component for ${newComponentName}`,
        metadata: { createdAt: new Date().toISOString() }
      });
    },
    onSuccess: () => {
      toast({
        title: "Component Registered",
        description: "New architecture component has been registered",
      });
      setNewComponentName('');
      setNewComponentType('');
      refetchComponents();
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: "Could not register architecture component",
        variant: "destructive",
      });
    }
  });

  // Add rule mutation
  const addRuleMutation = useMutation({
    mutationFn: () => {
      const id = newRuleName.toLowerCase().replace(/\s+/g, '-');
      return apiRequest('POST', '/api/telemetry/arch/rules', {
        id,
        name: newRuleName,
        type: 'constraint',
        condition: newRuleCondition,
        severity: newRuleSeverity,
        description: `Architecture rule: ${newRuleName}`
      });
    },
    onSuccess: () => {
      toast({
        title: "Rule Added",
        description: "New architecture rule has been added",
      });
      setNewRuleName('');
      setNewRuleCondition('');
      refetchRules();
    },
    onError: (error) => {
      toast({
        title: "Rule Addition Failed",
        description: "Could not add architecture rule",
        variant: "destructive",
      });
    }
  });

  // Validate architecture mutation
  const validateArchitectureMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/telemetry/arch/validate'),
    onSuccess: (data: ValidationResult) => {
      if (data.valid) {
        toast({
          title: "Validation Passed",
          description: "Architecture validation passed successfully",
        });
      } else {
        toast({
          title: "Validation Failed",
          description: `Found ${data.violations.length} architecture violations`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Validation Error",
        description: "Could not validate architecture",
        variant: "destructive",
      });
    }
  });

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Telemetry Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Monitor and configure SynthralOS telemetry, observability, and architecture governance
        </p>

        <Tabs defaultValue="overview" onValueChange={setSelectedTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracing">Distributed Tracing</TabsTrigger>
            <TabsTrigger value="langfuse">LLM Monitoring</TabsTrigger>
            <TabsTrigger value="architecture">Architecture Governance</TabsTrigger>
            <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Telemetry Status</CardTitle>
                <CardDescription>Active monitoring and observability services</CardDescription>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">OpenTelemetry</CardTitle>
                          {telemetryStatus?.services.openTelemetry ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Inactive</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Distributed tracing and metrics collection</p>
                      </CardContent>
                      <CardFooter>
                        {!telemetryStatus?.services.openTelemetry && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => initOpenTelemetryMutation.mutate()}
                            disabled={initOpenTelemetryMutation.isPending}
                          >
                            Initialize
                          </Button>
                        )}
                      </CardFooter>
                    </Card>

                    <Card className="border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">PostHog</CardTitle>
                          {telemetryStatus?.services.postHog ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Inactive</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Product analytics and user behavior tracking</p>
                      </CardContent>
                    </Card>

                    <Card className="border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Langfuse</CardTitle>
                          {telemetryStatus?.services.langfuse ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Inactive</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">LLM monitoring and observability</p>
                      </CardContent>
                    </Card>

                    <Card className="border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">StackStorm</CardTitle>
                          {telemetryStatus?.services.stackStorm ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Inactive</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Workflow automation and incident response</p>
                      </CardContent>
                    </Card>

                    <Card className="border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">ArchGW</CardTitle>
                          {telemetryStatus?.services.archGW ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Inactive</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Architecture governance and compliance</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distributed Tracing Tab */}
          <TabsContent value="tracing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Distributed Tracing</CardTitle>
                <CardDescription>OpenTelemetry trace visualization and monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  {telemetryStatus?.services.openTelemetry ? (
                    <>
                      <div className="border rounded-md p-4 bg-green-50">
                        <div className="flex items-center space-x-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">OpenTelemetry is active and collecting data</span>
                        </div>
                        <p className="mt-2 text-sm text-green-700">
                          Distributed tracing is enabled and collecting spans across the system.
                        </p>
                      </div>
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-2">Trace Visualization</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          View collected traces in your preferred visualization tool.
                        </p>
                        <div className="flex space-x-2">
                          <Button variant="outline">
                            <Activity className="mr-2 h-4 w-4" />
                            Jaeger UI
                          </Button>
                          <Button variant="outline">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Zipkin
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="border rounded-md p-4 bg-yellow-50">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800">OpenTelemetry is not active</span>
                      </div>
                      <p className="mt-2 text-sm text-yellow-700 mb-4">
                        Initialize OpenTelemetry to start collecting distributed traces.
                      </p>
                      <Button 
                        variant="default"
                        onClick={() => initOpenTelemetryMutation.mutate()}
                        disabled={initOpenTelemetryMutation.isPending}
                      >
                        Initialize OpenTelemetry
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LLM Monitoring Tab */}
          <TabsContent value="langfuse" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>LLM Monitoring</CardTitle>
                <CardDescription>Langfuse trace and generation tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-6">
                  {telemetryStatus?.services.langfuse ? (
                    <>
                      <div className="border rounded-md p-4 bg-green-50">
                        <div className="flex items-center space-x-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">Langfuse is active and monitoring LLM usage</span>
                        </div>
                        <p className="mt-2 text-sm text-green-700">
                          LLM monitoring is enabled and collecting data on prompts, completions, and scores.
                        </p>
                      </div>

                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-4">Create New Trace</h3>
                        <div className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor="trace-name">Trace Name</Label>
                            <Input 
                              id="trace-name" 
                              placeholder="Enter trace name" 
                              value={traceName} 
                              onChange={(e) => setTraceName(e.target.value)} 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="user-id">User ID</Label>
                            <Input 
                              id="user-id" 
                              placeholder="Enter user ID"
                              value={traceUserId} 
                              onChange={(e) => setTraceUserId(e.target.value)}
                            />
                          </div>
                          <Button 
                            onClick={() => createTraceMutation.mutate()}
                            disabled={!traceName || !traceUserId || createTraceMutation.isPending}
                          >
                            Create Trace
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="border rounded-md p-4 bg-yellow-50">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800">Langfuse is not active</span>
                      </div>
                      <p className="mt-2 text-sm text-yellow-700">
                        Configure your Langfuse API keys in the environment to enable LLM monitoring.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture Governance Tab */}
          <TabsContent value="architecture" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Architecture Components</CardTitle>
                  <CardDescription>System components and their relationships</CardDescription>
                </CardHeader>
                <CardContent>
                  {componentsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="border rounded-md divide-y">
                        {components?.components && components.components.length > 0 ? (
                          components.components.map((component) => (
                            <div key={component.id} className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{component.name}</h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {component.type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {component.id}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  {componentTypeIcon(component.type)}
                                </div>
                              </div>
                              {component.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {component.description}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            No components registered yet
                          </div>
                        )}
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-4">Register New Component</h3>
                        <div className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor="component-name">Component Name</Label>
                            <Input 
                              id="component-name" 
                              placeholder="Enter component name" 
                              value={newComponentName}
                              onChange={(e) => setNewComponentName(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="component-type">Component Type</Label>
                            <Input 
                              id="component-type" 
                              placeholder="service, library, database, etc."
                              value={newComponentType}
                              onChange={(e) => setNewComponentType(e.target.value)}
                            />
                          </div>
                          <Button 
                            onClick={() => registerComponentMutation.mutate()}
                            disabled={!newComponentName || !newComponentType || registerComponentMutation.isPending}
                          >
                            Register Component
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Architecture Rules</CardTitle>
                  <CardDescription>Governance and compliance rules</CardDescription>
                </CardHeader>
                <CardContent>
                  {rulesLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="border rounded-md divide-y">
                        {rules?.rules && rules.rules.length > 0 ? (
                          rules.rules.map((rule) => (
                            <div key={rule.id} className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{rule.name}</h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        rule.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                                        rule.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        rule.severity === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                      }
                                    >
                                      {rule.severity}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {rule.type}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm font-mono bg-muted p-2 rounded mt-2 overflow-x-auto">
                                {rule.condition}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            No rules defined yet
                          </div>
                        )}
                      </div>

                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-4">Add New Rule</h3>
                        <div className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor="rule-name">Rule Name</Label>
                            <Input 
                              id="rule-name" 
                              placeholder="Enter rule name"
                              value={newRuleName}
                              onChange={(e) => setNewRuleName(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="rule-condition">Rule Condition</Label>
                            <Input 
                              id="rule-condition" 
                              placeholder="component.type !== 'database' || component.dependencies.includes('orm')"
                              value={newRuleCondition}
                              onChange={(e) => setNewRuleCondition(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="rule-severity">Severity</Label>
                            <select
                              id="rule-severity"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={newRuleSeverity}
                              onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                          <Button 
                            onClick={() => addRuleMutation.mutate()}
                            disabled={!newRuleName || !newRuleCondition || addRuleMutation.isPending}
                          >
                            Add Rule
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => validateArchitectureMutation.mutate()}
                          disabled={validateArchitectureMutation.isPending}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Validate Architecture
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Usage Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
                <CardDescription>PostHog analytics and feature flags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-6">
                  {telemetryStatus?.services.postHog ? (
                    <>
                      <div className="border rounded-md p-4 bg-green-50">
                        <div className="flex items-center space-x-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">PostHog is active and collecting analytics</span>
                        </div>
                        <p className="mt-2 text-sm text-green-700">
                          Product analytics is enabled and tracking user behavior.
                        </p>
                      </div>

                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-4">Feature Flags</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">Multi-agent Support</div>
                              <p className="text-sm text-muted-foreground">
                                Enable advanced multi-agent workflows
                              </p>
                            </div>
                            <Switch id="multi-agent" />
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">Advanced RAG</div>
                              <p className="text-sm text-muted-foreground">
                                Enable advanced RAG techniques like HyDE and Chain-of-Density
                              </p>
                            </div>
                            <Switch id="advanced-rag" />
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">Enterprise Connectors</div>
                              <p className="text-sm text-muted-foreground">
                                Enable enterprise data connectors
                              </p>
                            </div>
                            <Switch id="enterprise-connectors" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="border rounded-md p-4 bg-yellow-50">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800">PostHog is not active</span>
                      </div>
                      <p className="mt-2 text-sm text-yellow-700">
                        Configure your PostHog API key in the environment to enable analytics tracking.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Helper function to render different icons based on component type
function componentTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'service':
      return <Server className="h-5 w-5 text-blue-500" />;
    case 'library':
      return <BookOpen className="h-5 w-5 text-purple-500" />;
    case 'database':
      return <Database className="h-5 w-5 text-green-500" />;
    case 'api':
      return <Globe className="h-5 w-5 text-indigo-500" />;
    case 'ui':
      return <Layers className="h-5 w-5 text-orange-500" />;
    case 'auth':
      return <Lock className="h-5 w-5 text-red-500" />;
    case 'agent':
      return <Sparkles className="h-5 w-5 text-yellow-500" />;
    case 'runtime':
      return <Code className="h-5 w-5 text-green-500" />;
    case 'workflow':
      return <GitBranch className="h-5 w-5 text-purple-500" />;
    case 'connector':
      return <GitFork className="h-5 w-5 text-blue-500" />;
    case 'memory':
      return <Clock className="h-5 w-5 text-amber-500" />;
    case 'schema':
      return <FileJson className="h-5 w-5 text-indigo-500" />;
    case 'plugin':
      return <Zap className="h-5 w-5 text-yellow-500" />;
    case 'model':
      return <FileCode className="h-5 w-5 text-teal-500" />;
    case 'pipeline':
      return <GitPullRequest className="h-5 w-5 text-blue-500" />;
    default:
      return <Hash className="h-5 w-5 text-gray-500" />;
  }
}

// Database icon component
function Database(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
      <path d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3" />
    </svg>
  );
}