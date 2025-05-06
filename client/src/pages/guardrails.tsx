// Removed AppLayout import since it's now in App.tsx
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// Define types for guardrails configuration
interface TransformationsConfig {
  enabled: boolean;
  removeEmailAddresses: boolean;
  removePII: boolean;
  enforceTaskFormat: boolean;
}

interface RoutingConfig {
  enabled: boolean;
  defaultRoute: string;
  routeMap: Record<string, string>;
  blockList: string[];
  transformations: TransformationsConfig;
}

interface SimilarityConfig {
  enabled: boolean;
  threshold: number;
  minTokensForDetection: number;
  maxHistorySize: number;
}

interface RetryConfig {
  strategy: 'linear' | 'exponential' | 'fixed';
  maxAttempts: number;
  baseDelay: number;
  fallbackProtocols: string[];
}

interface SecurityConfig {
  validatePrompts: boolean;
  validateResponses: boolean;
  profanityCheck: boolean;
  sensitiveDataCheck: boolean;
  harmfulContentCheck: boolean;
  blockedTopics: string[];
}

interface GuardrailsConfig {
  routing: RoutingConfig;
  similarity: SimilarityConfig;
  retry: RetryConfig;
  security: SecurityConfig;
}

// Default guardrails config for new instances
const defaultConfig: GuardrailsConfig = {
  routing: {
    enabled: true,
    defaultRoute: 'default',
    routeMap: {
      'technical': 'technical-route',
      'creative': 'creative-route',
      'research': 'research-route'
    },
    blockList: ['illegal', 'hacking', 'harmful'],
    transformations: {
      enabled: true,
      removeEmailAddresses: true,
      removePII: true,
      enforceTaskFormat: false
    }
  },
  similarity: {
    enabled: true,
    threshold: 0.85,
    minTokensForDetection: 5,
    maxHistorySize: 100
  },
  retry: {
    strategy: 'exponential',
    maxAttempts: 3,
    baseDelay: 1000,
    fallbackProtocols: ['autogpt', 'agentgpt', 'crewai']
  },
  security: {
    validatePrompts: true,
    validateResponses: true,
    profanityCheck: true,
    sensitiveDataCheck: true,
    harmfulContentCheck: true,
    blockedTopics: ['hacking', 'illegal', 'harmful']
  }
};

// Define types for activity data
type ActivityType = 'BLOCKED' | 'SIMILAR' | 'ROUTED' | 'MODIFIED' | 'RETRY';

interface BaseActivityItem {
  id: number;
  type: ActivityType;
  timestamp: string;
  prompt: string;
}

interface BlockedActivity extends BaseActivityItem {
  type: 'BLOCKED';
  reason: string;
}

interface SimilarActivity extends BaseActivityItem {
  type: 'SIMILAR';
  score: number;
}

interface RoutedActivity extends BaseActivityItem {
  type: 'ROUTED';
  from: string;
  to: string;
}

interface ModifiedActivity extends BaseActivityItem {
  type: 'MODIFIED';
  transformation: string;
}

interface RetryActivity extends BaseActivityItem {
  type: 'RETRY';
  attempt: number;
  protocol: string;
}

type ActivityItem = BlockedActivity | SimilarActivity | RoutedActivity | ModifiedActivity | RetryActivity;

// Activity will be loaded from the API

// This component handles the Guardrails configuration UI
function GuardrailsInterface() {
  const [config, setConfig] = useState(defaultConfig);
  const { toast } = useToast();

  // Fetch guardrails config from the server
  const { data, isLoading, error } = useQuery<GuardrailsConfig>({
    queryKey: ['/api/guardrails/config'],
    retry: false,
    // Enable loading from API
    enabled: true,
  });

  // Fetch activity data from the server
  const { 
    data: activityData,
    isLoading: activityLoading
  } = useQuery<ActivityItem[]>({
    queryKey: ['/api/guardrails/activity'],
    retry: false,
    enabled: true,
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: (newConfig: GuardrailsConfig) => {
      return apiRequest('PUT', '/api/guardrails/config', newConfig);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Guardrails configuration has been updated",
      });
      // Invalidate the config query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/guardrails/config'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your configuration",
        variant: "destructive",
      });
    }
  });

  // Use the fetched data if available, otherwise use the default config
  useEffect(() => {
    if (data) {
      setConfig(data);
    }
  }, [data]);

  // Update the configuration
  const handleSaveConfig = () => {
    updateConfigMutation.mutate(config);
  };

  // Update a specific part of the configuration
  const updateConfig = <K extends keyof GuardrailsConfig>(
    section: K,
    key: keyof GuardrailsConfig[K],
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  // Handle updating nested configuration values
  const updateNestedConfig = <
    K extends keyof GuardrailsConfig,
    S extends keyof GuardrailsConfig[K],
    P extends keyof GuardrailsConfig[K][S]
  >(
    section: K,
    subSection: S,
    key: P,
    value: GuardrailsConfig[K][S][P]
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: {
          ...prev[section][subSection],
          [key]: value
        }
      }
    }));
  };

  // Handle adding a new blocked topic
  const addBlockedTopic = (newTopic: string) => {
    if (newTopic && !config.security.blockedTopics.includes(newTopic)) {
      setConfig(prev => ({
        ...prev,
        security: {
          ...prev.security,
          blockedTopics: [...prev.security.blockedTopics, newTopic]
        }
      }));
    }
  };

  // Handle removing a blocked topic
  const removeBlockedTopic = (topic: string) => {
    setConfig(prev => ({
      ...prev,
      security: {
        ...prev.security,
        blockedTopics: prev.security.blockedTopics.filter(t => t !== topic)
      }
    }));
  };

  // Handle adding a fallback protocol
  const addFallbackProtocol = (protocol: string) => {
    if (protocol && !config.retry.fallbackProtocols.includes(protocol)) {
      setConfig(prev => ({
        ...prev,
        retry: {
          ...prev.retry,
          fallbackProtocols: [...prev.retry.fallbackProtocols, protocol]
        }
      }));
    }
  };

  // Handle removing a fallback protocol
  const removeFallbackProtocol = (protocol: string) => {
    setConfig(prev => ({
      ...prev,
      retry: {
        ...prev.retry,
        fallbackProtocols: prev.retry.fallbackProtocols.filter(p => p !== protocol)
      }
    }));
  };

  return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Agent Guardrails</h1>
            <p className="text-gray-500 mt-1">Configure security and validation settings for agent operations</p>
          </div>
          <Button 
            onClick={handleSaveConfig} 
            disabled={updateConfigMutation.isPending}
            className="self-start"
          >
            {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full md:w-1/2 grid-cols-2">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            {/* Routing Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Prompt Routing</CardTitle>
                <CardDescription>Control how prompts are routed to different agent protocols</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Smart Routing</Label>
                    <p className="text-sm text-muted-foreground">Route prompts based on content analysis</p>
                  </div>
                  <Switch 
                    checked={config.routing.enabled}
                    onCheckedChange={(checked) => updateConfig('routing', 'enabled', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Default Route</Label>
                  <Input 
                    value={config.routing.defaultRoute}
                    onChange={(e) => updateConfig('routing', 'defaultRoute', e.target.value)}
                    placeholder="default"
                  />
                  <p className="text-sm text-muted-foreground">The fallback route used when no specific route is matched</p>
                </div>

                <div className="space-y-2">
                  <Label>Blocked Content</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {config.routing.blockList.map(topic => (
                      <span key={topic} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {topic}
                        <button 
                          onClick={() => updateConfig('routing', 'blockList', config.routing.blockList.filter(t => t !== topic))}
                          className="ml-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800 inline-flex items-center justify-center w-4 h-4"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      id="new-blocked-term"
                      placeholder="Add blocked term..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateConfig('routing', 'blockList', [
                            ...config.routing.blockList, 
                            (e.target as HTMLInputElement).value
                          ]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button variant="outline" onClick={() => {
                      const input = document.getElementById('new-blocked-term') as HTMLInputElement;
                      if (input.value) {
                        updateConfig('routing', 'blockList', [
                          ...config.routing.blockList, 
                          input.value
                        ]);
                        input.value = '';
                      }
                    }}>
                      Add
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Content that contains these terms will be blocked</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Content Transformations</Label>
                    <Switch 
                      checked={config.routing.transformations.enabled}
                      onCheckedChange={(checked) => updateNestedConfig('routing', 'transformations', 'enabled', checked)}
                    />
                  </div>
                  
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="remove-emails"
                        checked={config.routing.transformations.removeEmailAddresses}
                        onCheckedChange={(checked) => updateNestedConfig('routing', 'transformations', 'removeEmailAddresses', checked)}
                        disabled={!config.routing.transformations.enabled}
                      />
                      <Label htmlFor="remove-emails">Remove Email Addresses</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="remove-pii"
                        checked={config.routing.transformations.removePII}
                        onCheckedChange={(checked) => updateNestedConfig('routing', 'transformations', 'removePII', checked)}
                        disabled={!config.routing.transformations.enabled}
                      />
                      <Label htmlFor="remove-pii">Remove Personal Identifiable Information</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="enforce-format"
                        checked={config.routing.transformations.enforceTaskFormat}
                        onCheckedChange={(checked) => updateNestedConfig('routing', 'transformations', 'enforceTaskFormat', checked)}
                        disabled={!config.routing.transformations.enabled}
                      />
                      <Label htmlFor="enforce-format">Enforce Task Format</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Similarity Detection */}
            <Card>
              <CardHeader>
                <CardTitle>Similarity Detection</CardTitle>
                <CardDescription>Prevent duplicate prompts and detect similar requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Similarity Detection</Label>
                    <p className="text-sm text-muted-foreground">Detect and flag similar prompts</p>
                  </div>
                  <Switch 
                    checked={config.similarity.enabled}
                    onCheckedChange={(checked) => updateConfig('similarity', 'enabled', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Similarity Threshold ({(config.similarity.threshold * 100).toFixed(0)}%)</Label>
                    <span className="text-sm text-muted-foreground">{config.similarity.threshold.toFixed(2)}</span>
                  </div>
                  <Slider 
                    value={[config.similarity.threshold * 100]} 
                    min={50} 
                    max={100} 
                    step={1}
                    onValueChange={(value) => updateConfig('similarity', 'threshold', value[0] / 100)}
                    disabled={!config.similarity.enabled}
                  />
                  <p className="text-sm text-muted-foreground">Prompts with similarity above this threshold will be flagged</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Minimum Tokens for Detection</Label>
                  <Input 
                    type="number"
                    value={config.similarity.minTokensForDetection}
                    onChange={(e) => updateConfig('similarity', 'minTokensForDetection', parseInt(e.target.value) || 0)}
                    min={1}
                    max={50}
                    disabled={!config.similarity.enabled}
                  />
                  <p className="text-sm text-muted-foreground">Minimum prompt length (in tokens) to trigger similarity detection</p>
                </div>
                
                <div className="space-y-2">
                  <Label>History Size</Label>
                  <Input 
                    type="number"
                    value={config.similarity.maxHistorySize}
                    onChange={(e) => updateConfig('similarity', 'maxHistorySize', parseInt(e.target.value) || 10)}
                    min={10}
                    max={1000}
                    disabled={!config.similarity.enabled}
                  />
                  <p className="text-sm text-muted-foreground">Number of past prompts to keep for similarity comparison</p>
                </div>
              </CardContent>
            </Card>

            {/* Retry Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Retry Strategy</CardTitle>
                <CardDescription>Configure how failures are handled and retried</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Retry Strategy</Label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={config.retry.strategy}
                    onChange={(e) => updateConfig('retry', 'strategy', e.target.value)}
                  >
                    <option value="linear">Linear Backoff</option>
                    <option value="exponential">Exponential Backoff</option>
                    <option value="fixed">Fixed Delay</option>
                  </select>
                  <p className="text-sm text-muted-foreground">How to space out retry attempts</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Maximum Attempts</Label>
                  <Input 
                    type="number"
                    value={config.retry.maxAttempts}
                    onChange={(e) => updateConfig('retry', 'maxAttempts', parseInt(e.target.value) || 1)}
                    min={1}
                    max={10}
                  />
                  <p className="text-sm text-muted-foreground">Maximum number of retry attempts before failing</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Base Delay (ms)</Label>
                  <Input 
                    type="number"
                    value={config.retry.baseDelay}
                    onChange={(e) => updateConfig('retry', 'baseDelay', parseInt(e.target.value) || 100)}
                    min={100}
                    max={30000}
                    step={100}
                  />
                  <p className="text-sm text-muted-foreground">Base delay between retry attempts in milliseconds</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Fallback Protocols</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {config.retry.fallbackProtocols.map(protocol => (
                      <span key={protocol} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {protocol}
                        <button 
                          onClick={() => removeFallbackProtocol(protocol)}
                          className="ml-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 inline-flex items-center justify-center w-4 h-4"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      id="new-protocol"
                      placeholder="Add protocol..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addFallbackProtocol((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button variant="outline" onClick={() => {
                      const input = document.getElementById('new-protocol') as HTMLInputElement;
                      if (input.value) {
                        addFallbackProtocol(input.value);
                        input.value = '';
                      }
                    }}>
                      Add
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Protocols to fall back to if the primary protocol fails</p>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Security Checks</CardTitle>
                <CardDescription>Configure security filters and content moderation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Validate Prompts</Label>
                    <p className="text-sm text-muted-foreground">Check prompts for security issues before processing</p>
                  </div>
                  <Switch 
                    checked={config.security.validatePrompts}
                    onCheckedChange={(checked) => updateConfig('security', 'validatePrompts', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Validate Responses</Label>
                    <p className="text-sm text-muted-foreground">Check agent responses for security issues</p>
                  </div>
                  <Switch 
                    checked={config.security.validateResponses}
                    onCheckedChange={(checked) => updateConfig('security', 'validateResponses', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Profanity Check</Label>
                    <p className="text-sm text-muted-foreground">Filter out profanity in prompts and responses</p>
                  </div>
                  <Switch 
                    checked={config.security.profanityCheck}
                    onCheckedChange={(checked) => updateConfig('security', 'profanityCheck', checked)}
                    disabled={!config.security.validatePrompts && !config.security.validateResponses}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sensitive Data Check</Label>
                    <p className="text-sm text-muted-foreground">Detect and redact sensitive information</p>
                  </div>
                  <Switch 
                    checked={config.security.sensitiveDataCheck}
                    onCheckedChange={(checked) => updateConfig('security', 'sensitiveDataCheck', checked)}
                    disabled={!config.security.validatePrompts && !config.security.validateResponses}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Harmful Content Check</Label>
                    <p className="text-sm text-muted-foreground">Detect potentially harmful instructions or content</p>
                  </div>
                  <Switch 
                    checked={config.security.harmfulContentCheck}
                    onCheckedChange={(checked) => updateConfig('security', 'harmfulContentCheck', checked)}
                    disabled={!config.security.validatePrompts && !config.security.validateResponses}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Blocked Topics</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {config.security.blockedTopics.map(topic => (
                      <span key={topic} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {topic}
                        <button 
                          onClick={() => removeBlockedTopic(topic)}
                          className="ml-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800 inline-flex items-center justify-center w-4 h-4"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      id="new-topic"
                      placeholder="Add blocked topic..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addBlockedTopic((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      disabled={!config.security.validatePrompts && !config.security.validateResponses}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const input = document.getElementById('new-topic') as HTMLInputElement;
                        if (input.value) {
                          addBlockedTopic(input.value);
                          input.value = '';
                        }
                      }}
                      disabled={!config.security.validatePrompts && !config.security.validateResponses}
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Topics that will be blocked if detected in content</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Guardrails Activity</CardTitle>
                <CardDescription>Recent guardrails events and logs</CardDescription>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
                  </div>
                ) : (
                <div className="border rounded-md divide-y">
                  {Array.isArray(activityData) && activityData.map((activity: ActivityItem) => (
                    <div key={activity.id} className="p-4">
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {activity.type === 'BLOCKED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Blocked
                            </span>
                          )}
                          {activity.type === 'SIMILAR' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Similar ({(activity.score * 100).toFixed(0)}%)
                            </span>
                          )}
                          {activity.type === 'ROUTED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Routed ({activity.from} → {activity.to})
                            </span>
                          )}
                          {activity.type === 'MODIFIED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              Modified ({activity.transformation})
                            </span>
                          )}
                          {activity.type === 'RETRY' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              Retry (Attempt {activity.attempt}, {activity.protocol})
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{activity.prompt}</p>
                      {activity.type === 'BLOCKED' && (
                        <p className="text-sm text-gray-500 mt-1">Reason: {activity.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}

// Export as a named export to prevent conflicting exports with the one in App.tsx
// This is necessary because we're wrapping it in AppLayout in App.tsx
function GuardrailsPage() {
  return <GuardrailsInterface />;
}

export default GuardrailsPage;