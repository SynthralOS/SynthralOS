import React from 'react';
import { Link } from 'wouter';
import { AppLayout } from '@/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TabsContent, TabsList, TabsTrigger, Tabs } from '@/components/ui/tabs';
import { 
  Database, 
  Link2, 
  Github, 
  Cloud, 
  BarChart, 
  MessageSquare, 
  FileText, 
  ArrowRight 
} from 'lucide-react';
import { SiAirbyte, SiHuggingface, SiPinecone, SiRudderstack, SiGithub, SiSlack, SiTwitter, SiMongodb, SiPostgresql, SiOracle, SiSnowflake, SiKafka } from 'react-icons/si';

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'available' | 'coming-soon' | 'beta';
  category: string;
  link?: string;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ 
  title, 
  description, 
  icon, 
  status, 
  category, 
  link 
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div className={`text-xs px-2 py-1 rounded-full ${
            status === 'available' ? 'bg-green-100 text-green-800' : 
            status === 'beta' ? 'bg-blue-100 text-blue-800' : 
            'bg-amber-100 text-amber-800'
          }`}>
            {status === 'available' ? 'Available' : status === 'beta' ? 'Beta' : 'Coming Soon'}
          </div>
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{category}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
        {status === 'available' && link ? (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={link}>
              Configure <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" disabled>
            {status === 'beta' ? 'Join Beta' : 'Coming Soon'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default function IntegrationsPage() {
  const integrations: IntegrationCardProps[] = [
    {
      title: "Airbyte",
      description: "Connect to hundreds of data sources and destinations with Airbyte's ETL platform.",
      icon: <SiAirbyte className="h-5 w-5" />,
      status: "available",
      category: "Data Integration",
      link: "/integrations/airbyte"
    },
    {
      title: "Composio",
      description: "Build and deploy complex API workflows with visual interface.",
      icon: <Link2 className="h-5 w-5" />,
      status: "coming-soon",
      category: "API Orchestration"
    },
    {
      title: "Nango",
      description: "Connect to third-party APIs with simplified authentication.",
      icon: <Github className="h-5 w-5" />,
      status: "coming-soon",
      category: "API Authentication"
    },
    {
      title: "Integuru",
      description: "No-code integration platform for connecting applications.",
      icon: <Cloud className="h-5 w-5" />,
      status: "coming-soon",
      category: "App Integration"
    },
    {
      title: "Langflow",
      description: "Build LLM workflows with drag & drop interface.",
      icon: <MessageSquare className="h-5 w-5" />,
      status: "beta",
      category: "LLM Orchestration"
    },
    {
      title: "Huginn",
      description: "Create intelligent agents that monitor and act on your behalf.",
      icon: <SiHuggingface className="h-5 w-5" />,
      status: "coming-soon",
      category: "Agent Automation"
    },
    {
      title: "Pinecone",
      description: "Managed vector database for embeddings and similarity search.",
      icon: <SiPinecone className="h-5 w-5" />,
      status: "beta",
      category: "Vector Database"
    },
    {
      title: "Rudderstack",
      description: "Customer data platform for collecting, storing and routing customer data.",
      icon: <SiRudderstack className="h-5 w-5" />,
      status: "coming-soon",
      category: "Customer Data"
    },
    {
      title: "Slack",
      description: "Send notifications and alerts to your Slack workspace.",
      icon: <SiSlack className="h-5 w-5" />,
      status: "beta",
      category: "Messaging"
    },
    {
      title: "Twitter/X",
      description: "Monitor and post to Twitter/X from your workflows.",
      icon: <SiTwitter className="h-5 w-5" />,
      status: "beta",
      category: "Social Media"
    },
    {
      title: "GitHub",
      description: "Integrate with GitHub repositories and workflows.",
      icon: <SiGithub className="h-5 w-5" />,
      status: "beta",
      category: "DevOps"
    },
    {
      title: "PostgreSQL",
      description: "Connect to PostgreSQL databases for data storage and retrieval.",
      icon: <SiPostgresql className="h-5 w-5" />,
      status: "available",
      category: "Database"
    }
  ];

  const dataIntegrations = integrations.filter(i => ['Data Integration', 'Database'].includes(i.category));
  const apiIntegrations = integrations.filter(i => ['API Orchestration', 'API Authentication', 'App Integration'].includes(i.category));
  const aiIntegrations = integrations.filter(i => ['LLM Orchestration', 'Agent Automation', 'Vector Database'].includes(i.category));
  const serviceIntegrations = integrations.filter(i => ['Messaging', 'Social Media', 'DevOps', 'Customer Data'].includes(i.category));

  return (
    <AppLayout title="Integrations">
      <div className="p-6 h-full overflow-auto">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Integrations</h1>
              <p className="text-muted-foreground">
                Connect SynthralOS with external systems and services
              </p>
            </div>
            <Button>
              <Link2 className="mr-2 h-4 w-4" />
              Request Integration
            </Button>
          </div>

          <Separator />

          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
            </TabsList>
            <div className="mt-6">
              <TabsContent value="all" className="m-0">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {integrations.map((integration, index) => (
                    <IntegrationCard
                      key={index}
                      title={integration.title}
                      description={integration.description}
                      icon={integration.icon}
                      status={integration.status}
                      category={integration.category}
                      link={integration.link}
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="data" className="m-0">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {dataIntegrations.map((integration, index) => (
                    <IntegrationCard
                      key={index}
                      title={integration.title}
                      description={integration.description}
                      icon={integration.icon}
                      status={integration.status}
                      category={integration.category}
                      link={integration.link}
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="api" className="m-0">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {apiIntegrations.map((integration, index) => (
                    <IntegrationCard
                      key={index}
                      title={integration.title}
                      description={integration.description}
                      icon={integration.icon}
                      status={integration.status}
                      category={integration.category}
                      link={integration.link}
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="ai" className="m-0">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {aiIntegrations.map((integration, index) => (
                    <IntegrationCard
                      key={index}
                      title={integration.title}
                      description={integration.description}
                      icon={integration.icon}
                      status={integration.status}
                      category={integration.category}
                      link={integration.link}
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="services" className="m-0">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {serviceIntegrations.map((integration, index) => (
                    <IntegrationCard
                      key={index}
                      title={integration.title}
                      description={integration.description}
                      icon={integration.icon}
                      status={integration.status}
                      category={integration.category}
                      link={integration.link}
                    />
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}