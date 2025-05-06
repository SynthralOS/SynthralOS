import { useState } from 'react';
import { useLocation } from 'wouter';
import { AppLayout } from '../layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function NewSocialMonitor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platforms: ['twitter', 'reddit'],
    keywords: [] as string[],
    accounts: [] as string[],
    frequency: 60, // minutes
    alertThreshold: 70, // percentage
    isActive: true
  });
  
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentAccount, setCurrentAccount] = useState('');
  
  // Create a new social monitor
  const createMonitor = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/social-monitors', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-monitors'] });
      toast({
        title: 'Monitor created',
        description: 'Your social media monitor has been created successfully.',
      });
      setLocation('/social-monitoring');
    },
    onError: (error) => {
      toast({
        title: 'Error creating monitor',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleFrequencyChange = (value: number[]) => {
    setFormData((prev) => ({ ...prev, frequency: value[0] }));
  };

  const handleThresholdChange = (value: number[]) => {
    setFormData((prev) => ({ ...prev, alertThreshold: value[0] }));
  };

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        platforms: [...prev.platforms, platform]
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        platforms: prev.platforms.filter(p => p !== platform)
      }));
    }
  };

  const addKeyword = () => {
    if (currentKeyword.trim() && !formData.keywords.includes(currentKeyword.trim())) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, currentKeyword.trim()]
      }));
      setCurrentKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addAccount = () => {
    if (currentAccount.trim() && !formData.accounts.includes(currentAccount.trim())) {
      setFormData((prev) => ({
        ...prev,
        accounts: [...prev.accounts, currentAccount.trim()]
      }));
      setCurrentAccount('');
    }
  };

  const removeAccount = (account: string) => {
    setFormData((prev) => ({
      ...prev,
      accounts: prev.accounts.filter(a => a !== account)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this monitor.',
        variant: 'destructive'
      });
      return;
    }
    
    if (formData.keywords.length === 0) {
      toast({
        title: 'Keywords required',
        description: 'Please add at least one keyword to monitor.',
        variant: 'destructive'
      });
      return;
    }
    
    createMonitor.mutate(formData);
  };

  const availablePlatforms = [
    { id: 'twitter', name: 'Twitter' },
    { id: 'facebook', name: 'Facebook' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'reddit', name: 'Reddit' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'youtube', name: 'YouTube' },
    { id: 'tiktok', name: 'TikTok' }
  ];

  return (
    <AppLayout>
      <div className="relative container mx-auto py-8 pb-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Create Social Monitor</h1>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => setLocation('/social-connectors')}
            >
              Manage Connectors
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/social-monitoring')}
            >
              Cancel
            </Button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Configure the basic settings for your social media monitor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <div className="flex justify-between">
                  <Label htmlFor="name">Monitor Name <span className="text-red-500">*</span></Label>
                  {!formData.name && (
                    <span className="text-red-500 text-sm">Required</span>
                  )}
                </div>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="E.g., Brand Monitoring, Competitor Analysis"
                  value={formData.name}
                  onChange={handleTextChange}
                  className={!formData.name ? "border-red-300 focus:ring-red-300" : ""}
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="What's the purpose of this monitor?"
                  value={formData.description}
                  onChange={handleTextChange}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Active Status</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable to start monitoring immediately
                  </div>
                </div>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={handleSwitchChange}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Monitoring Parameters</CardTitle>
              <CardDescription>
                Configure what to monitor and how frequently.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Platforms to Monitor</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availablePlatforms.map(platform => (
                    <div key={platform.id} className="flex items-center space-x-2">
                      <Switch
                        id={`platform-${platform.id}`}
                        checked={formData.platforms.includes(platform.id)}
                        onCheckedChange={(checked) => handlePlatformChange(platform.id, checked)}
                      />
                      <Label htmlFor={`platform-${platform.id}`}>{platform.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Keywords to Track <span className="text-red-500">*</span></Label>
                  {formData.keywords.length === 0 && (
                    <span className="text-red-500 text-sm">Required - add at least one keyword</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Add keyword or phrase (e.g., company name, product)"
                    value={currentKeyword}
                    onChange={e => setCurrentKeyword(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={addKeyword}
                    disabled={!currentKeyword.trim()}
                    variant={currentKeyword.trim() ? "default" : "outline"}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.keywords.length > 0 ? (
                    formData.keywords.map(keyword => (
                      <Badge key={keyword} className="flex items-center gap-1">
                        {keyword}
                        <X 
                          size={14} 
                          className="cursor-pointer" 
                          onClick={() => removeKeyword(keyword)}
                        />
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No keywords added yet. Add keywords that you want to track across social media platforms.
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Social Media Accounts (Optional)</Label>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="@username or account name (e.g., @company, @competitor)"
                    value={currentAccount}
                    onChange={e => setCurrentAccount(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAccount();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={addAccount}
                    disabled={!currentAccount.trim()}
                    variant={currentAccount.trim() ? "default" : "outline"}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.accounts.length > 0 ? (
                    formData.accounts.map(account => (
                      <Badge key={account} variant="outline" className="flex items-center gap-1">
                        {account}
                        <X 
                          size={14} 
                          className="cursor-pointer" 
                          onClick={() => removeAccount(account)}
                        />
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No accounts added yet. Add specific social media accounts to monitor (optional).
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label>Check Frequency (minutes)</Label>
                  <div className="text-sm text-muted-foreground">
                    How often should we check for new content?
                  </div>
                </div>
                <div className="pt-4">
                  <Slider
                    defaultValue={[formData.frequency]}
                    min={15}
                    max={1440}
                    step={15}
                    onValueChange={handleFrequencyChange}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
                    <span>Every {formData.frequency} minutes</span>
                    <span>{formData.frequency >= 60 ? `${Math.floor(formData.frequency / 60)} hour(s)` : ''}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label>Alert Threshold</Label>
                  <div className="text-sm text-muted-foreground">
                    Alert me when this percentage of criteria is matched
                  </div>
                </div>
                <div className="pt-4">
                  <Slider
                    defaultValue={[formData.alertThreshold]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={handleThresholdChange}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
                    <span>Low</span>
                    <span>{formData.alertThreshold}% match</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Fixed bottom action bar */}
          <div className="fixed bottom-0 left-0 right-0 py-4 px-6 bg-background border-t z-10 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/social-monitoring')}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden md:inline-block">
                  {formData.name && formData.keywords.length > 0 
                    ? 'Ready to create monitor' 
                    : 'Fill in required fields to continue'}
                </span>
                <Button 
                  type="submit" 
                  disabled={createMonitor.isPending}
                  className="px-6"
                  size="lg"
                >
                  {createMonitor.isPending ? 'Creating...' : 'Create Monitor'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}