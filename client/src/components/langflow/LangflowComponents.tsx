import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  LucideIcon, 
  Search, 
  DownloadCloud, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight,
  Bot,
  Link2,
  Database,
  Server,
  Wrench,
  Brain,
  Zap
} from 'lucide-react';

interface LangflowComponent {
  id: string;
  type: string;
  display_name: string;
  description: string;
  category: string;
  is_template?: boolean;
  template_inputs?: Record<string, any>;
  fields: Record<string, any>;
  icon?: string;
}

interface LangflowComponentsResponse {
  components: Record<string, LangflowComponent[]>;
  categories: string[];
  templates: LangflowComponent[];
}

// Map category to icon
const categoryIconMap: Record<string, LucideIcon> = {
  llms: Bot,
  chains: Link2,
  vectorstores: Database,
  agents: Zap,
  memories: Brain,
  tools: Wrench,
  default: Server
};

const LangflowComponents: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Fetch components
  const { 
    data: componentsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<LangflowComponentsResponse>({ 
    queryKey: ['/api/langflow/components'],
    retry: 1,
  });

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Filter components based on search term
  const filterComponents = (components: LangflowComponent[]) => {
    if (!searchTerm) return components;
    
    return components.filter(component => 
      component.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Render component icon
  const renderComponentIcon = (category: string) => {
    const IconComponent = categoryIconMap[category.toLowerCase()] || categoryIconMap.default;
    return <IconComponent className="h-4 w-4" />;
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing Components",
      description: "Fetching latest Langflow components",
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex justify-center items-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin text-primary/50" />
        </CardContent>
      </Card>
    );
  }

  if (error || !componentsData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            Error Loading Components
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            There was an error loading the Langflow components. This could be because:
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground mb-4">
            <li>The Langflow API is not properly configured</li>
            <li>The Langflow server is not running</li>
            <li>There's a network connection issue</li>
          </ul>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Langflow Components</CardTitle>
        <CardDescription>
          Available components for building workflows
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-auto">
        <Accordion type="multiple" className="w-full">
          {Object.entries(componentsData.components).map(([category, components]) => {
            const filteredComponents = filterComponents(components);
            if (filteredComponents.length === 0) return null;
            
            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="py-2">
                  <div className="flex items-center">
                    {renderComponentIcon(category)}
                    <span className="ml-2">{category}</span>
                    <Badge variant="outline" className="ml-2">
                      {filteredComponents.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2">
                    {filteredComponents.map((component) => (
                      <div 
                        key={component.id} 
                        className="p-2 border rounded-md hover:bg-accent text-sm"
                      >
                        <div className="font-medium">{component.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {component.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        
        {componentsData.templates?.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Available Templates</h3>
              <div className="grid gap-2">
                {componentsData.templates.map((template) => (
                  <div 
                    key={template.id} 
                    className="p-2 border rounded-md hover:bg-accent text-sm flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{template.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.description}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          {Object.keys(componentsData.components).length} component categories loaded
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-3 w-3 mr-2" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LangflowComponents;