import { useState, useEffect } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, Upload, AlertTriangle, Settings, Bell, Shield, Fingerprint, Zap, Coffee, Moon, Sun, PanelLeft, MessageSquare } from 'lucide-react';

// Define types for user preferences
interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    workflows: boolean;
    security: boolean;
    marketing: boolean;
  };
  appearance: {
    theme: 'system' | 'light' | 'dark';
    sidebarCollapsed: boolean;
    denseMode: boolean;
    codeBlockTheme: string;
    fontSize: 'sm' | 'base' | 'lg' | 'xl';
  };
  agentDefaults: {
    llmProvider: string;
    defaultModel: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  workflow: {
    autosaveInterval: number;
    showRuntimeLogs: boolean;
    confirmDeletion: boolean;
    enableAdvancedFeatures: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    loginNotifications: boolean;
    allowApiKeyAccess: boolean;
  };
}

// Default user preferences
const defaultPreferences: UserPreferences = {
  notifications: {
    email: true,
    push: true,
    workflows: true,
    security: true,
    marketing: false,
  },
  appearance: {
    theme: 'system',
    sidebarCollapsed: false,
    denseMode: false,
    codeBlockTheme: 'nord',
    fontSize: 'base',
  },
  agentDefaults: {
    llmProvider: 'openai',
    defaultModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful AI assistant built into SynthralOS.',
  },
  workflow: {
    autosaveInterval: 60,
    showRuntimeLogs: true,
    confirmDeletion: true,
    enableAdvancedFeatures: false,
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 30,
    loginNotifications: true,
    allowApiKeyAccess: false,
  },
};

export default function UserPreferences() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const { toast } = useToast();
  const [safeUser, setSafeUser] = useState<any>({
    username: '',
    email: '',
    name: '',
    image: ''
  });

  // Safely set user data when it's available
  useEffect(() => {
    if (user) {
      setSafeUser({
        id: user.id || 0,
        username: user.username || '',
        email: user.email || '',
        name: user.name || '',
        image: user.image || ''
      });
    }
  }, [user]);

  // Fetch user preferences
  const { 
    data, 
    isLoading,
    error 
  } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
    retry: false,
    enabled: isAuthenticated && !!user,
  });

  // Update user preferences when data is loaded
  useEffect(() => {
    if (data) {
      setPreferences(data);
    }
  }, [data]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (newPreferences: UserPreferences) => {
      return apiRequest('PUT', '/api/user/preferences', newPreferences);
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved successfully",
      });
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Could not update your preferences",
        variant: "destructive",
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (profileData: any) => {
      return apiRequest('PUT', '/api/user/profile', profileData);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Could not update your profile",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const savePreferences = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  // Handle notification toggle
  const toggleNotification = (key: keyof UserPreferences['notifications']) => {
    setPreferences({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: !preferences.notifications[key]
      }
    });
  };

  // Handle appearance change
  const updateAppearance = (key: keyof UserPreferences['appearance'], value: any) => {
    setPreferences({
      ...preferences,
      appearance: {
        ...preferences.appearance,
        [key]: value
      }
    });
  };

  // Handle agent defaults change
  const updateAgentDefaults = (key: keyof UserPreferences['agentDefaults'], value: any) => {
    setPreferences({
      ...preferences,
      agentDefaults: {
        ...preferences.agentDefaults,
        [key]: value
      }
    });
  };

  // Handle workflow preferences change
  const updateWorkflowPreferences = (key: keyof UserPreferences['workflow'], value: any) => {
    setPreferences({
      ...preferences,
      workflow: {
        ...preferences.workflow,
        [key]: value
      }
    });
  };

  // Handle security preferences change
  const updateSecurityPreferences = (key: keyof UserPreferences['security'], value: any) => {
    setPreferences({
      ...preferences,
      security: {
        ...preferences.security,
        [key]: value
      }
    });
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <AppLayout requireAuth={false}>
        <div className="container mx-auto py-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <AppLayout requireAuth={false}>
        <div className="container mx-auto py-6">
          <div className="border rounded-md p-8 text-center max-w-lg mx-auto shadow-sm">
            <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to view and update your preferences.
            </p>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please log in with your credentials to access the settings page.
              </p>
              <Button asChild className="px-6">
                <Link href="/login">
                  Log In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-1">User Preferences</h1>
        <p className="text-muted-foreground mb-8">
          Customize your SynthralOS experience with personalized settings
        </p>

        <div className="grid gap-6 md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={safeUser.image} />
                  <AvatarFallback className="text-lg">
                    {safeUser.username?.[0]?.toUpperCase() || safeUser.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-lg">{safeUser.username || 'User'}</h3>
                  {safeUser.email && (
                    <p className="text-sm text-muted-foreground">{safeUser.email}</p>
                  )}
                  {safeUser.name && (
                    <p className="text-sm">{safeUser.name}</p>
                  )}
                </div>
                <div className="mt-4 w-full">
                  <Button variant="outline" className="w-full" size="sm">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Change Avatar
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Account Active</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Member since {new Date().toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="mb-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="agent">Agent Defaults</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your profile information and public details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="John Doe" 
                      defaultValue={safeUser.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      placeholder="johndoe" 
                      defaultValue={safeUser.username}
                      disabled 
                    />
                    <p className="text-xs text-muted-foreground">
                      Username cannot be changed after account creation
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      defaultValue={safeUser.email}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Profile Image URL</Label>
                    <Input 
                      id="image" 
                      placeholder="https://example.com/profile.jpg"
                      defaultValue={safeUser.image}
                    />
                    <p className="text-xs text-muted-foreground">
                      Direct link to your profile image
                    </p>
                  </div>
                </CardContent>
                <div className="px-6 py-4 flex justify-end">
                  <Button onClick={() => updateProfileMutation.mutate({
                    name: (document.getElementById('name') as HTMLInputElement)?.value,
                    email: (document.getElementById('email') as HTMLInputElement)?.value,
                    image: (document.getElementById('image') as HTMLInputElement)?.value,
                  })}>
                    Save Profile
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Control how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center">
                      <Bell className="h-4 w-4 mr-2" />
                      Notification Channels
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive email updates about your activity</p>
                        </div>
                        <Switch 
                          checked={preferences.notifications.email}
                          onCheckedChange={() => toggleNotification('email')}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                        </div>
                        <Switch 
                          checked={preferences.notifications.push}
                          onCheckedChange={() => toggleNotification('push')}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Notification Types
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Workflow Notifications</Label>
                          <p className="text-sm text-muted-foreground">Updates about your workflow runs and executions</p>
                        </div>
                        <Switch 
                          checked={preferences.notifications.workflows}
                          onCheckedChange={() => toggleNotification('workflows')}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Security Alerts</Label>
                          <p className="text-sm text-muted-foreground">Important security notifications and alerts</p>
                        </div>
                        <Switch 
                          checked={preferences.notifications.security}
                          onCheckedChange={() => toggleNotification('security')}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Marketing Communications</Label>
                          <p className="text-sm text-muted-foreground">Updates about new features and promotions</p>
                        </div>
                        <Switch 
                          checked={preferences.notifications.marketing}
                          onCheckedChange={() => toggleNotification('marketing')}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <div className="px-6 py-4 flex justify-end">
                  <Button onClick={savePreferences}>
                    Save Notification Preferences
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize the look and feel of your SynthralOS interface
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          variant={preferences.appearance.theme === 'light' ? 'default' : 'outline'} 
                          className="justify-start"
                          onClick={() => updateAppearance('theme', 'light')}
                        >
                          <Sun className="h-4 w-4 mr-2" />
                          Light
                        </Button>
                        <Button 
                          variant={preferences.appearance.theme === 'dark' ? 'default' : 'outline'} 
                          className="justify-start"
                          onClick={() => updateAppearance('theme', 'dark')}
                        >
                          <Moon className="h-4 w-4 mr-2" />
                          Dark
                        </Button>
                        <Button 
                          variant={preferences.appearance.theme === 'system' ? 'default' : 'outline'} 
                          className="justify-start"
                          onClick={() => updateAppearance('theme', 'system')}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          System
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Sidebar Collapsed by Default</Label>
                          <p className="text-sm text-muted-foreground">Start with sidebar collapsed for more screen space</p>
                        </div>
                        <Switch 
                          checked={preferences.appearance.sidebarCollapsed}
                          onCheckedChange={(checked) => updateAppearance('sidebarCollapsed', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Dense Mode</Label>
                          <p className="text-sm text-muted-foreground">Compact UI with reduced spacing</p>
                        </div>
                        <Switch 
                          checked={preferences.appearance.denseMode}
                          onCheckedChange={(checked) => updateAppearance('denseMode', checked)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                      <Label htmlFor="codeBlockTheme">Code Block Theme</Label>
                      <Select 
                        value={preferences.appearance.codeBlockTheme} 
                        onValueChange={(value) => updateAppearance('codeBlockTheme', value)}
                      >
                        <SelectTrigger id="codeBlockTheme">
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nord">Nord</SelectItem>
                          <SelectItem value="github">GitHub</SelectItem>
                          <SelectItem value="dracula">Dracula</SelectItem>
                          <SelectItem value="night-owl">Night Owl</SelectItem>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="vscode">VS Code</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="fontSize">Font Size</Label>
                      <Select 
                        value={preferences.appearance.fontSize}
                        onValueChange={(value: any) => updateAppearance('fontSize', value)}
                      >
                        <SelectTrigger id="fontSize">
                          <SelectValue placeholder="Select font size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="base">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                          <SelectItem value="xl">Extra Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <div className="px-6 py-4 flex justify-end">
                  <Button onClick={savePreferences}>
                    Save Appearance Settings
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Agent Defaults Tab */}
            <TabsContent value="agent">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Defaults</CardTitle>
                  <CardDescription>
                    Set default parameters for AI agents and model preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="llmProvider">Default LLM Provider</Label>
                      <Select 
                        value={preferences.agentDefaults.llmProvider}
                        onValueChange={(value) => updateAgentDefaults('llmProvider', value)}
                      >
                        <SelectTrigger id="llmProvider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="perplexity">Perplexity</SelectItem>
                          <SelectItem value="mistral">Mistral AI</SelectItem>
                          <SelectItem value="google">Google AI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="defaultModel">Default Model</Label>
                      <Select 
                        value={preferences.agentDefaults.defaultModel}
                        onValueChange={(value) => updateAgentDefaults('defaultModel', value)}
                      >
                        <SelectTrigger id="defaultModel">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</SelectItem>
                          <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                          <SelectItem value="llama-3.1-sonar-large-128k-online">Llama 3.1 Sonar Large</SelectItem>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="temperature">Temperature: {preferences.agentDefaults.temperature.toFixed(1)}</Label>
                      </div>
                      <Input 
                        id="temperature"
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={preferences.agentDefaults.temperature}
                        onChange={(e) => updateAgentDefaults('temperature', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Deterministic (0.0)</span>
                        <span>Creative (2.0)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxTokens">Max Output Tokens: {preferences.agentDefaults.maxTokens}</Label>
                      <Input 
                        id="maxTokens"
                        type="range"
                        min="256"
                        max="8192"
                        step="256"
                        value={preferences.agentDefaults.maxTokens}
                        onChange={(e) => updateAgentDefaults('maxTokens', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>256</span>
                        <span>8192</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="systemPrompt">Default System Prompt</Label>
                      <Textarea 
                        id="systemPrompt"
                        value={preferences.agentDefaults.systemPrompt}
                        onChange={(e) => updateAgentDefaults('systemPrompt', e.target.value)}
                        rows={4}
                        placeholder="Enter the default system prompt for your agents"
                      />
                      <p className="text-xs text-muted-foreground">
                        This system prompt will be used as the default for all new agents
                      </p>
                    </div>
                  </div>
                </CardContent>
                <div className="px-6 py-4 flex justify-end">
                  <Button onClick={savePreferences}>
                    Save Agent Defaults
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Workflow Tab */}
            <TabsContent value="workflow">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Preferences</CardTitle>
                  <CardDescription>
                    Customize how you work with SynthralOS workflows
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="autosaveInterval">Autosave Interval (seconds)</Label>
                      <Input
                        id="autosaveInterval"
                        type="number"
                        min="0"
                        value={preferences.workflow.autosaveInterval}
                        onChange={(e) => updateWorkflowPreferences('autosaveInterval', parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Set to 0 to disable autosave
                      </p>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showRuntimeLogs">Show Runtime Logs</Label>
                        <p className="text-sm text-muted-foreground">Display execution logs during workflow runs</p>
                      </div>
                      <Switch 
                        id="showRuntimeLogs"
                        checked={preferences.workflow.showRuntimeLogs}
                        onCheckedChange={(checked) => updateWorkflowPreferences('showRuntimeLogs', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="confirmDeletion">Confirm Before Deletion</Label>
                        <p className="text-sm text-muted-foreground">Ask for confirmation before deleting workflows</p>
                      </div>
                      <Switch 
                        id="confirmDeletion"
                        checked={preferences.workflow.confirmDeletion}
                        onCheckedChange={(checked) => updateWorkflowPreferences('confirmDeletion', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableAdvancedFeatures">Enable Advanced Features</Label>
                        <p className="text-sm text-muted-foreground">Show experimental and advanced workflow features</p>
                      </div>
                      <Switch 
                        id="enableAdvancedFeatures"
                        checked={preferences.workflow.enableAdvancedFeatures}
                        onCheckedChange={(checked) => updateWorkflowPreferences('enableAdvancedFeatures', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
                <div className="px-6 py-4 flex justify-end">
                  <Button onClick={savePreferences}>
                    Save Workflow Preferences
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and access controls
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="twoFactorAuth" className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-red-500" />
                          Two-Factor Authentication
                        </Label>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="twoFactorAuth"
                          checked={preferences.security.twoFactorAuth}
                          onCheckedChange={(checked) => updateSecurityPreferences('twoFactorAuth', checked)}
                        />
                        {preferences.security.twoFactorAuth ? 
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Enabled</Badge> : 
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Disabled</Badge>
                        }
                      </div>
                    </div>
                    
                    <Separator />

                    <div className="grid gap-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Select 
                        value={preferences.security.sessionTimeout.toString()}
                        onValueChange={(value) => updateSecurityPreferences('sessionTimeout', parseInt(value))}
                      >
                        <SelectTrigger id="sessionTimeout">
                          <SelectValue placeholder="Select timeout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                          <SelectItem value="480">8 hours</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        You'll be automatically logged out after this period of inactivity
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="loginNotifications">Login Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive email alerts for new login activity</p>
                      </div>
                      <Switch 
                        id="loginNotifications"
                        checked={preferences.security.loginNotifications}
                        onCheckedChange={(checked) => updateSecurityPreferences('loginNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowApiKeyAccess" className="flex items-center">
                          <Fingerprint className="h-4 w-4 mr-2 text-yellow-500" />
                          API Key Access
                        </Label>
                        <p className="text-sm text-muted-foreground">Allow programmatic access via API keys</p>
                      </div>
                      <Switch 
                        id="allowApiKeyAccess"
                        checked={preferences.security.allowApiKeyAccess}
                        onCheckedChange={(checked) => updateSecurityPreferences('allowApiKeyAccess', checked)}
                      />
                    </div>

                    {preferences.security.allowApiKeyAccess && (
                      <div className="border rounded-md p-4 bg-yellow-50">
                        <h4 className="text-sm font-medium text-yellow-800 flex items-center mb-2">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          API Keys
                        </h4>
                        <p className="text-sm text-yellow-700 mb-4">
                          API keys provide full access to your account. Manage them carefully and never share them publicly.
                        </p>
                        <Button variant="outline" size="sm" className="bg-white">
                          Manage API Keys
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="px-6 py-4 flex justify-end">
                  <Button onClick={savePreferences}>
                    Save Security Settings
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}