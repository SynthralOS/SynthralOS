import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FiRefreshCw, FiTrash2, FiExternalLink, FiPlus, FiBriefcase } from 'react-icons/fi';
import { Skeleton } from '@/components/ui/skeleton';
import { SiGoogle, SiGithub, SiSlack, SiAsana, SiTrello, SiNotion } from 'react-icons/si';
import { AppLayout } from '@/layouts/AppLayout';

interface Integration {
  id: number;
  name: string;
  service: string;
  config: string;
  createdAt: string;
  updatedAt: string;
}

// Map provider names to their icons
const providerIcons: Record<string, JSX.Element> = {
  'Google': <SiGoogle className="w-6 h-6 mr-2" />,
  'GitHub': <SiGithub className="w-6 h-6 mr-2" />,
  'Microsoft': <FiBriefcase className="w-6 h-6 mr-2" />,
  'Slack': <SiSlack className="w-6 h-6 mr-2" />,
  'Asana': <SiAsana className="w-6 h-6 mr-2" />,
  'Trello': <SiTrello className="w-6 h-6 mr-2" />,
  'Notion': <SiNotion className="w-6 h-6 mr-2" />,
};

// Calculate if a token is expired
const isTokenExpired = (expiresAt?: number) => {
  if (!expiresAt) return false;
  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt;
};

// Format expiry time
const formatExpiryTime = (expiresAt?: number) => {
  if (!expiresAt) return 'No expiration';
  
  const expiryDate = new Date(expiresAt * 1000);
  return expiryDate.toLocaleString();
};

export default function IntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Query integrations
  const { data: integrations, isLoading } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
    retry: false,
  });

  // Delete integration mutation
  const deleteIntegration = useMutation({
    mutationFn: async (id: number) => {
      setDeletingId(id);
      return apiRequest('DELETE', `/api/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({
        title: 'Integration removed',
        description: 'The integration has been removed successfully',
      });
      setDeletingId(null);
    },
    onError: (error) => {
      toast({
        title: 'Error removing integration',
        description: error.message,
        variant: 'destructive',
      });
      setDeletingId(null);
    },
  });

  // Refresh token mutation
  const refreshToken = useMutation({
    mutationFn: async (id: number) => {
      setRefreshingId(id);
      return apiRequest('POST', `/api/oidc/refresh-token/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({
        title: 'Token refreshed',
        description: 'The integration token has been refreshed successfully',
      });
      setRefreshingId(null);
    },
    onError: (error) => {
      toast({
        title: 'Error refreshing token',
        description: error.message,
        variant: 'destructive',
      });
      setRefreshingId(null);
    },
  });

  // Render the content
  const renderContent = () => {
    // Render loading skeleton
    if (isLoading) {
      return (
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">API Integrations</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 h-full overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">API Integrations</h1>
          <Link href="/oidc-providers">
            <Button>
              <FiPlus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
          </Link>
        </div>
        
        {!integrations || integrations.length === 0 ? (
          <Alert>
            <AlertTitle>No integrations found</AlertTitle>
            <AlertDescription>
              You haven't connected any external services yet. 
              <Link href="/oidc-providers">
                <Button variant="link" className="p-0 h-auto font-normal">
                  Add your first integration
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => {
              // Parse the config
              const config = JSON.parse(integration.config || '{}');
              const expiresAt = config.expiresAt;
              const expired = isTokenExpired(expiresAt);
              const hasRefreshToken = !!config.refreshToken;
              const userInfo = config.userInfo ? JSON.parse(config.userInfo) : null;
              
              // Get provider icon or use default
              const ProviderIcon = providerIcons[integration.name] || <FiExternalLink className="w-6 h-6 mr-2" />;
              
              return (
                <Card key={integration.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center">
                      {ProviderIcon}
                      <div>
                        <CardTitle>{integration.name}</CardTitle>
                        <CardDescription>
                          {userInfo && userInfo.email ? userInfo.email : 'Connected account'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={expired ? "destructive" : "default"}>
                          {expired ? "Expired" : "Active"}
                        </Badge>
                      </div>
                      
                      {expiresAt && (
                        <div className="text-sm">
                          <span className="font-medium">Expires:</span>
                          <span className="ml-2 text-gray-600">{formatExpiryTime(expiresAt)}</span>
                        </div>
                      )}
                      
                      {userInfo && userInfo.name && (
                        <div className="text-sm">
                          <span className="font-medium">User:</span>
                          <span className="ml-2 text-gray-600">{userInfo.name}</span>
                        </div>
                      )}
                      
                      {Array.isArray(config.scopes) && (
                        <div className="text-sm">
                          <span className="font-medium">Scopes:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {config.scopes.map((scope: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => deleteIntegration.mutate(integration.id)}
                      disabled={deletingId === integration.id}
                    >
                      {deletingId === integration.id ? (
                        <div className="flex items-center">
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                          Removing...
                        </div>
                      ) : (
                        <>
                          <FiTrash2 className="mr-1 h-4 w-4" />
                          Remove
                        </>
                      )}
                    </Button>
                    
                    {hasRefreshToken && (expired || true) && (
                      <Button
                        size="sm"
                        onClick={() => refreshToken.mutate(integration.id)}
                        disabled={refreshingId === integration.id}
                      >
                        {refreshingId === integration.id ? (
                          <div className="flex items-center">
                            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                            Refreshing...
                          </div>
                        ) : (
                          <>
                            <FiRefreshCw className="mr-1 h-4 w-4" />
                            Refresh Token
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout title="Integrations">
      {renderContent()}
    </AppLayout>
  );
}