import { useState } from 'react';
import { useLocation } from 'wouter';
import { AppLayout } from '@/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

type SocialConnector = {
  id: number;
  platform: string;
  name: string;
  isActive: boolean;
  isAuthenticated?: boolean;
  createdAt: string;
};

export default function SocialConnectors() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('twitter');
  
  const [newConnector, setNewConnector] = useState({
    name: '',
    platform: 'twitter',
    credentials: {
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      accessTokenSecret: ''
    }
  });

  // Fetch social connectors
  const { 
    data: connectors,
    isLoading,
    error
  } = useQuery<SocialConnector[]>({
    queryKey: ['/api/social-connectors'],
    retry: false
  });

  // Create a new connector
  const createConnector = useMutation({
    mutationFn: async (data: typeof newConnector) => {
      const response = await apiRequest('POST', '/api/social-connectors', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-connectors'] });
      toast({
        title: 'Connector created',
        description: 'Social media connector has been successfully created.',
      });
      setConnectorDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error creating connector',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Delete a connector
  const deleteConnector = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/social-connectors/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-connectors'] });
      toast({
        title: 'Connector deleted',
        description: 'Social media connector has been successfully removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting connector',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setNewConnector({
      name: '',
      platform: 'twitter',
      credentials: {
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        accessTokenSecret: ''
      }
    });
    setSelectedPlatform('twitter');
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    setNewConnector(prev => ({
      ...prev,
      platform,
      credentials: getPlatformCredentialsTemplate(platform)
    }));
  };

  const getPlatformCredentialsTemplate = (platform: string) => {
    switch(platform) {
      case 'twitter':
        return {
          apiKey: '',
          apiSecret: '',
          accessToken: '',
          accessTokenSecret: ''
        };
      case 'facebook':
        return {
          appId: '',
          appSecret: '',
          accessToken: ''
        };
      case 'linkedin':
        return {
          clientId: '',
          clientSecret: '',
          accessToken: ''
        };
      case 'tweepy':
        return {
          apiKey: '',
          apiSecret: '',
          accessToken: '',
          accessTokenSecret: '',
          bearerToken: ''
        };
      case 'twint':
        return {
          // No API credentials needed for Twint as it scrapes without API
          noCredentials: true
        };
      case 'social-listener':
        return {
          redditClientId: '',
          redditClientSecret: '',
          redditUsername: '',
          redditPassword: '',
          telegramApiId: '',
          telegramApiHash: '',
          telegramPhoneNumber: ''
        };
      case 'newscatcher':
        return {
          apiKey: ''
        };
      case 'huginn':
        return {
          endpoint: '',
          apiKey: '',
          webhookUrl: ''
        };
      default:
        return {};
    }
  };

  const handleCredentialChange = (key: string, value: string) => {
    setNewConnector(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [key]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newConnector.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this connector.',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate credentials based on platform
    const missingCredentials = validateCredentials();
    if (missingCredentials.length > 0) {
      toast({
        title: 'Missing credentials',
        description: `Please provide ${missingCredentials.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }
    
    createConnector.mutate(newConnector);
  };

  const validateCredentials = (): string[] => {
    const missing: string[] = [];
    
    switch(selectedPlatform) {
      case 'twitter':
        if (!newConnector.credentials.apiKey) missing.push('API Key');
        if (!newConnector.credentials.apiSecret) missing.push('API Secret');
        if (!newConnector.credentials.accessToken) missing.push('Access Token');
        if (!newConnector.credentials.accessTokenSecret) missing.push('Access Token Secret');
        break;
      case 'facebook':
        if (!newConnector.credentials.appId) missing.push('App ID');
        if (!newConnector.credentials.appSecret) missing.push('App Secret');
        if (!newConnector.credentials.accessToken) missing.push('Access Token');
        break;
      case 'linkedin':
        if (!newConnector.credentials.clientId) missing.push('Client ID');
        if (!newConnector.credentials.clientSecret) missing.push('Client Secret');
        if (!newConnector.credentials.accessToken) missing.push('Access Token');
        break;
      case 'tweepy':
        if (!newConnector.credentials.apiKey) missing.push('API Key');
        if (!newConnector.credentials.apiSecret) missing.push('API Secret');
        if (!newConnector.credentials.accessToken) missing.push('Access Token');
        if (!newConnector.credentials.accessTokenSecret) missing.push('Access Token Secret');
        break;
      case 'twint':
        // No credentials needed for Twint
        break;
      case 'social-listener':
        if (!newConnector.credentials.redditClientId) missing.push('Reddit Client ID');
        if (!newConnector.credentials.redditClientSecret) missing.push('Reddit Client Secret');
        if (!newConnector.credentials.redditUsername) missing.push('Reddit Username');
        if (!newConnector.credentials.redditPassword) missing.push('Reddit Password');
        if (!newConnector.credentials.telegramApiId) missing.push('Telegram API ID');
        if (!newConnector.credentials.telegramApiHash) missing.push('Telegram API Hash');
        break;
      case 'newscatcher':
        if (!newConnector.credentials.apiKey) missing.push('API Key');
        break;
      case 'huginn':
        if (!newConnector.credentials.endpoint) missing.push('Endpoint URL');
        if (!newConnector.credentials.apiKey) missing.push('API Key');
        break;
    }
    
    return missing;
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </AppLayout>
    );
  }

  // Error state or no connectors
  if (error || !connectors) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Social Connectors</h1>
            <Dialog open={connectorDialogOpen} onOpenChange={setConnectorDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Social Connector</Button>
              </DialogTrigger>
              {renderConnectorDialog()}
            </Dialog>
          </div>
          
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>No social connectors found</CardTitle>
              <CardDescription>
                You haven't connected any social media accounts yet. Add a connector to integrate with social media platforms.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Dialog open={connectorDialogOpen} onOpenChange={setConnectorDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Add Social Connector</Button>
                </DialogTrigger>
                {renderConnectorDialog()}
              </Dialog>
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Social Connectors</h1>
          <Dialog open={connectorDialogOpen} onOpenChange={setConnectorDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Social Connector</Button>
            </DialogTrigger>
            {renderConnectorDialog()}
          </Dialog>
        </div>
        
        {connectors.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>No social connectors found</CardTitle>
              <CardDescription>
                You haven't connected any social media accounts yet. Add a connector to integrate with social media platforms.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Dialog open={connectorDialogOpen} onOpenChange={setConnectorDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Add Social Connector</Button>
                </DialogTrigger>
                {renderConnectorDialog()}
              </Dialog>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectors.map((connector) => (
              <Card key={connector.id} className="overflow-hidden">
                <CardHeader className="bg-muted/40">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{connector.name}</CardTitle>
                      <CardDescription className="capitalize">{connector.platform}</CardDescription>
                    </div>
                    <Badge variant={connector.isAuthenticated ? "default" : "destructive"}>
                      {connector.isAuthenticated ? "Authenticated" : "Auth Failed"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-4 text-sm text-muted-foreground">
                    <p>Connected on {new Date(connector.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this connector?')) {
                        deleteConnector.mutate(connector.id);
                      }
                    }}
                    disabled={deleteConnector.isPending}
                  >
                    {deleteConnector.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                  <Button onClick={() => setLocation(`/social-connectors/${connector.id}`)}>
                    Manage
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );

  function renderConnectorDialog() {
    return (
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Social Media Connector</DialogTitle>
            <DialogDescription>
              Connect to a social media platform to monitor and analyze content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="connector-name">Connector Name</Label>
              <Input
                id="connector-name"
                value={newConnector.name}
                onChange={(e) => setNewConnector(prev => ({ ...prev, name: e.target.value }))}
                placeholder="E.g., My Twitter Account, Company Facebook"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Platform</Label>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mt-2">
                  <h4 className="w-full text-sm font-semibold text-muted-foreground mb-1">Social Media Platforms</h4>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedPlatform === 'twitter' ? "default" : "outline"}
                    onClick={() => handlePlatformChange('twitter')}
                    className="flex items-center gap-2"
                  >
                    <Icons.twitter className="h-4 w-4" />
                    Twitter/X
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedPlatform === 'facebook' ? "default" : "outline"}
                    onClick={() => handlePlatformChange('facebook')}
                    className="flex items-center gap-2"
                  >
                    <Icons.facebook className="h-4 w-4" />
                    Facebook
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedPlatform === 'linkedin' ? "default" : "outline"}
                    onClick={() => handlePlatformChange('linkedin')}
                    className="flex items-center gap-2"
                  >
                    <Icons.linkedin className="h-4 w-4" />
                    LinkedIn
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <h4 className="w-full text-sm font-semibold text-muted-foreground mb-1">OSINT Tools</h4>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedPlatform === 'tweepy' ? "default" : "outline"}
                    onClick={() => handlePlatformChange('tweepy')}
                    className="flex items-center gap-2"
                  >
                    <Icons.tweepy className="h-4 w-4" />
                    Tweepy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedPlatform === 'twint' ? "default" : "outline"}
                    onClick={() => handlePlatformChange('twint')}
                    className="flex items-center gap-2"
                  >
                    <Icons.twint className="h-4 w-4" />
                    Twint
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedPlatform === 'social-listener' ? "default" : "outline"}
                    onClick={() => handlePlatformChange('social-listener')}
                    className="flex items-center gap-2"
                  >
                    <Icons.socialListener className="h-4 w-4" />
                    Social-Listener
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedPlatform === 'newscatcher' ? "default" : "outline"}
                    onClick={() => handlePlatformChange('newscatcher')}
                    className="flex items-center gap-2"
                  >
                    <Icons.newscatcher className="h-4 w-4" />
                    NewsCatcher
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedPlatform === 'huginn' ? "default" : "outline"}
                    onClick={() => handlePlatformChange('huginn')}
                    className="flex items-center gap-2"
                  >
                    <Icons.huginn className="h-4 w-4" />
                    Huginn
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>API Credentials</Label>
              
              {selectedPlatform === 'twitter' && (
                <>
                  <div>
                    <Label htmlFor="twitter-api-key" className="text-sm">API Key</Label>
                    <Input
                      id="twitter-api-key"
                      value={newConnector.credentials.apiKey || ''}
                      onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
                      placeholder="Twitter API Key"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter-api-secret" className="text-sm">API Secret</Label>
                    <Input
                      id="twitter-api-secret"
                      type="password"
                      value={newConnector.credentials.apiSecret || ''}
                      onChange={(e) => handleCredentialChange('apiSecret', e.target.value)}
                      placeholder="Twitter API Secret"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter-access-token" className="text-sm">Access Token</Label>
                    <Input
                      id="twitter-access-token"
                      value={newConnector.credentials.accessToken || ''}
                      onChange={(e) => handleCredentialChange('accessToken', e.target.value)}
                      placeholder="Twitter Access Token"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter-access-token-secret" className="text-sm">Access Token Secret</Label>
                    <Input
                      id="twitter-access-token-secret"
                      type="password"
                      value={newConnector.credentials.accessTokenSecret || ''}
                      onChange={(e) => handleCredentialChange('accessTokenSecret', e.target.value)}
                      placeholder="Twitter Access Token Secret"
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              
              {selectedPlatform === 'facebook' && (
                <>
                  <div>
                    <Label htmlFor="facebook-app-id" className="text-sm">App ID</Label>
                    <Input
                      id="facebook-app-id"
                      value={newConnector.credentials.appId || ''}
                      onChange={(e) => handleCredentialChange('appId', e.target.value)}
                      placeholder="Facebook App ID"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook-app-secret" className="text-sm">App Secret</Label>
                    <Input
                      id="facebook-app-secret"
                      type="password"
                      value={newConnector.credentials.appSecret || ''}
                      onChange={(e) => handleCredentialChange('appSecret', e.target.value)}
                      placeholder="Facebook App Secret"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook-access-token" className="text-sm">Access Token</Label>
                    <Input
                      id="facebook-access-token"
                      value={newConnector.credentials.accessToken || ''}
                      onChange={(e) => handleCredentialChange('accessToken', e.target.value)}
                      placeholder="Facebook Access Token"
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              
              {selectedPlatform === 'linkedin' && (
                <>
                  <div>
                    <Label htmlFor="linkedin-client-id" className="text-sm">Client ID</Label>
                    <Input
                      id="linkedin-client-id"
                      value={newConnector.credentials.clientId || ''}
                      onChange={(e) => handleCredentialChange('clientId', e.target.value)}
                      placeholder="LinkedIn Client ID"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin-client-secret" className="text-sm">Client Secret</Label>
                    <Input
                      id="linkedin-client-secret"
                      type="password"
                      value={newConnector.credentials.clientSecret || ''}
                      onChange={(e) => handleCredentialChange('clientSecret', e.target.value)}
                      placeholder="LinkedIn Client Secret"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin-access-token" className="text-sm">Access Token</Label>
                    <Input
                      id="linkedin-access-token"
                      value={newConnector.credentials.accessToken || ''}
                      onChange={(e) => handleCredentialChange('accessToken', e.target.value)}
                      placeholder="LinkedIn Access Token"
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              
              {selectedPlatform === 'tweepy' && (
                <>
                  <div>
                    <Label htmlFor="tweepy-api-key" className="text-sm">API Key</Label>
                    <Input
                      id="tweepy-api-key"
                      value={newConnector.credentials.apiKey || ''}
                      onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
                      placeholder="Twitter API Key"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tweepy-api-secret" className="text-sm">API Secret</Label>
                    <Input
                      id="tweepy-api-secret"
                      type="password"
                      value={newConnector.credentials.apiSecret || ''}
                      onChange={(e) => handleCredentialChange('apiSecret', e.target.value)}
                      placeholder="Twitter API Secret"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tweepy-access-token" className="text-sm">Access Token</Label>
                    <Input
                      id="tweepy-access-token"
                      value={newConnector.credentials.accessToken || ''}
                      onChange={(e) => handleCredentialChange('accessToken', e.target.value)}
                      placeholder="Twitter Access Token"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tweepy-access-token-secret" className="text-sm">Access Token Secret</Label>
                    <Input
                      id="tweepy-access-token-secret"
                      type="password"
                      value={newConnector.credentials.accessTokenSecret || ''}
                      onChange={(e) => handleCredentialChange('accessTokenSecret', e.target.value)}
                      placeholder="Twitter Access Token Secret"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tweepy-bearer-token" className="text-sm">Bearer Token</Label>
                    <Input
                      id="tweepy-bearer-token"
                      type="password"
                      value={newConnector.credentials.bearerToken || ''}
                      onChange={(e) => handleCredentialChange('bearerToken', e.target.value)}
                      placeholder="Twitter Bearer Token"
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              
              {selectedPlatform === 'twint' && (
                <div className="p-4 bg-muted/20 rounded-md text-center">
                  <div className="mb-2">
                    <Icons.info className="h-5 w-5 mx-auto text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No API credentials required. Twint scrapes Twitter without using the official API.
                  </p>
                </div>
              )}
              
              {selectedPlatform === 'social-listener' && (
                <>
                  <div className="border-b pb-2 mb-3">
                    <h4 className="font-medium text-sm mb-2">Reddit Credentials</h4>
                    <div>
                      <Label htmlFor="reddit-client-id" className="text-sm">Client ID</Label>
                      <Input
                        id="reddit-client-id"
                        value={newConnector.credentials.redditClientId || ''}
                        onChange={(e) => handleCredentialChange('redditClientId', e.target.value)}
                        placeholder="Reddit Client ID"
                        className="mt-1"
                      />
                    </div>
                    <div className="mt-2">
                      <Label htmlFor="reddit-client-secret" className="text-sm">Client Secret</Label>
                      <Input
                        id="reddit-client-secret"
                        type="password"
                        value={newConnector.credentials.redditClientSecret || ''}
                        onChange={(e) => handleCredentialChange('redditClientSecret', e.target.value)}
                        placeholder="Reddit Client Secret"
                        className="mt-1"
                      />
                    </div>
                    <div className="mt-2">
                      <Label htmlFor="reddit-username" className="text-sm">Username</Label>
                      <Input
                        id="reddit-username"
                        value={newConnector.credentials.redditUsername || ''}
                        onChange={(e) => handleCredentialChange('redditUsername', e.target.value)}
                        placeholder="Reddit Username"
                        className="mt-1"
                      />
                    </div>
                    <div className="mt-2">
                      <Label htmlFor="reddit-password" className="text-sm">Password</Label>
                      <Input
                        id="reddit-password"
                        type="password"
                        value={newConnector.credentials.redditPassword || ''}
                        onChange={(e) => handleCredentialChange('redditPassword', e.target.value)}
                        placeholder="Reddit Password"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Telegram Credentials</h4>
                    <div>
                      <Label htmlFor="telegram-api-id" className="text-sm">API ID</Label>
                      <Input
                        id="telegram-api-id"
                        value={newConnector.credentials.telegramApiId || ''}
                        onChange={(e) => handleCredentialChange('telegramApiId', e.target.value)}
                        placeholder="Telegram API ID"
                        className="mt-1"
                      />
                    </div>
                    <div className="mt-2">
                      <Label htmlFor="telegram-api-hash" className="text-sm">API Hash</Label>
                      <Input
                        id="telegram-api-hash"
                        type="password"
                        value={newConnector.credentials.telegramApiHash || ''}
                        onChange={(e) => handleCredentialChange('telegramApiHash', e.target.value)}
                        placeholder="Telegram API Hash"
                        className="mt-1"
                      />
                    </div>
                    <div className="mt-2">
                      <Label htmlFor="telegram-phone" className="text-sm">Phone Number</Label>
                      <Input
                        id="telegram-phone"
                        value={newConnector.credentials.telegramPhoneNumber || ''}
                        onChange={(e) => handleCredentialChange('telegramPhoneNumber', e.target.value)}
                        placeholder="+1234567890"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </>
              )}
              
              {selectedPlatform === 'newscatcher' && (
                <div>
                  <Label htmlFor="newscatcher-api-key" className="text-sm">API Key</Label>
                  <Input
                    id="newscatcher-api-key"
                    type="password"
                    value={newConnector.credentials.apiKey || ''}
                    onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
                    placeholder="NewsCatcher API Key"
                    className="mt-1"
                  />
                </div>
              )}
              
              {selectedPlatform === 'huginn' && (
                <>
                  <div>
                    <Label htmlFor="huginn-endpoint" className="text-sm">Endpoint URL</Label>
                    <Input
                      id="huginn-endpoint"
                      value={newConnector.credentials.endpoint || ''}
                      onChange={(e) => handleCredentialChange('endpoint', e.target.value)}
                      placeholder="https://your-huginn-instance.com/api"
                      className="mt-1"
                    />
                  </div>
                  <div className="mt-2">
                    <Label htmlFor="huginn-api-key" className="text-sm">API Key</Label>
                    <Input
                      id="huginn-api-key"
                      type="password"
                      value={newConnector.credentials.apiKey || ''}
                      onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
                      placeholder="Huginn API Key"
                      className="mt-1"
                    />
                  </div>
                  <div className="mt-2">
                    <Label htmlFor="huginn-webhook" className="text-sm">Webhook URL (Optional)</Label>
                    <Input
                      id="huginn-webhook"
                      value={newConnector.credentials.webhookUrl || ''}
                      onChange={(e) => handleCredentialChange('webhookUrl', e.target.value)}
                      placeholder="https://your-webhook.com/endpoint"
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConnectorDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createConnector.isPending}>
              {createConnector.isPending ? 'Adding...' : 'Add Connector'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  }
}