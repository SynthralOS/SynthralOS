import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { AppLayout } from '@/layouts/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';

// Form schema
const providerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  issuerUrl: z.string().url({ message: 'Must be a valid URL' }),
  clientId: z.string().min(1, { message: 'Client ID is required' }),
  clientSecret: z.string().min(1, { message: 'Client Secret is required' }),
  redirectUri: z.string().url({ message: 'Must be a valid URL' }),
  scopes: z.string().min(1, { message: 'Scopes are required' }),
});

export default function OIDCProvidersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Query OIDC providers
  const { data: providers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/oidc-providers'],
    retry: false,
  });

  // Form setup
  const form = useForm<z.infer<typeof providerSchema>>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: '',
      issuerUrl: '',
      clientId: '',
      clientSecret: '',
      redirectUri: window.location.origin + '/api/oidc/callback',
      scopes: 'openid profile email',
    },
  });

  // Create provider mutation
  const createProvider = useMutation({
    mutationFn: async (values: z.infer<typeof providerSchema>) => {
      // Convert space-separated scopes to array
      const formattedValues = {
        ...values,
        scopes: JSON.stringify(values.scopes.split(' ')),
      };
      
      return apiRequest('POST', '/api/oidc-providers', formattedValues);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/oidc-providers'] });
      toast({
        title: 'Provider created',
        description: 'Your OIDC provider has been created successfully',
      });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error creating provider',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete provider mutation
  const deleteProvider = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/oidc-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/oidc-providers'] });
      toast({
        title: 'Provider deleted',
        description: 'The OIDC provider has been deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting provider',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Start OIDC login mutation
  const startLogin = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('GET', `/api/oidc/login/${id}`);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // Redirect to the authorization URL
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast({
        title: 'Error starting OAuth flow',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: z.infer<typeof providerSchema>) => {
    createProvider.mutate(values);
  };

  // Render content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-6 h-full overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">OIDC Providers</h1>
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
          <h1 className="text-2xl font-bold">OIDC Providers</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Provider</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add OIDC Provider</DialogTitle>
                <DialogDescription>
                  Add a new OpenID Connect provider for API integration
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Google, GitHub, etc." {...field} />
                        </FormControl>
                        <FormDescription>
                          A friendly name for this provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="issuerUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issuer URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://accounts.google.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          The base URL of the OIDC provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="redirectUri"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Redirect URI</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The callback URL for the OAuth flow
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="scopes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scopes</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Space-separated list of scopes to request
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProvider.isPending}>
                      {createProvider.isPending ? 'Adding...' : 'Add Provider'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers?.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-gray-500">No OIDC providers configured yet.</p>
              <Button onClick={() => setOpen(true)} variant="outline" className="mt-4">
                Add your first provider
              </Button>
            </div>
          ) : (
            providers?.map((provider: any) => (
              <Card key={provider.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle>{provider.name}</CardTitle>
                  <CardDescription className="truncate">{provider.issuerUrl}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Client ID:</span>
                      <span className="ml-2 text-gray-600">{provider.clientId.substring(0, 10)}...</span>
                    </div>
                    <div>
                      <span className="font-medium">Scopes:</span>
                      <span className="ml-2 text-gray-600">
                        {typeof provider.scopes === 'string' 
                          ? JSON.parse(provider.scopes).join(', ') 
                          : Array.isArray(provider.scopes) 
                            ? provider.scopes.join(', ') 
                            : 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => deleteProvider.mutate(provider.id)}
                    disabled={deleteProvider.isPending}
                  >
                    Delete
                  </Button>
                  <Button
                    onClick={() => startLogin.mutate(provider.id)}
                    disabled={startLogin.isPending}
                  >
                    Connect
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="OIDC Providers">
      {renderContent()}
    </AppLayout>
  );
}