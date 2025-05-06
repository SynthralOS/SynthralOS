import React from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Index from "@/pages/index";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Builder from "@/pages/builder";
import Templates from "@/pages/templates";
import NotFound from "@/pages/not-found";
import SocialMonitoring from "@/pages/social-monitoring";
import SocialMonitoringNew from "@/pages/social-monitoring-new";
import SocialConnectors from "@/pages/social-connectors";
import { AppLayout } from "@/layouts/AppLayout";
import Osint from "@/pages/osint";
import OIDCProviders from "@/pages/oidc-providers";
import Integrations from "@/pages/integrations";
import WorkflowExecution from "@/pages/workflow-execution";
import WorkflowVisualizationDemo from "@/pages/workflow-visualization-demo";
import BillingPage from "@/pages/BillingPage";
import UsagePage from "@/pages/UsagePage";
import ScraperPage from "@/pages/scraper";
import AgentProtocols from "@/pages/agent-protocols";
import TestProtocols from "@/pages/test-protocols";
import SimpleProtocols from "@/pages/simple-protocols";
import GuardrailsPage from "@/pages/guardrails";
import RuntimeDashboard from "@/pages/runtime-dashboard";
import MemoryDashboard from "@/pages/memory-dashboard";
import RagDbSwitch from "@/pages/rag-db-switch";
import TelemetryDashboard from "@/pages/telemetry-dashboard";
import ActivityLog from "@/pages/activity-log";
import Executions from "@/pages/executions";
import ExecutionDetails from "@/pages/execution-details";
import LangflowEditor from "@/pages/langflow-editor";
import LangflowSettings from "@/pages/langflow-settings";
import LangChainPage from "@/pages/langchain";
import About from "@/pages/about";
import Features from "@/pages/features";
import Pricing from "@/pages/pricing";
import Contact from "@/pages/contact";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
//import UserPreferences from "@/pages/user-preferences"; // Removed temporarily
import { ThemeProvider } from "@/components/ThemeProvider";
import { ComingSoon } from "@/components/ComingSoon";

// Lazy loaded components
const Security = React.lazy(() => import('@/pages/security'));
const Cookies = React.lazy(() => import('@/pages/cookies'));
const Roadmap = React.lazy(() => import('@/pages/roadmap'));
const Careers = React.lazy(() => import('@/pages/careers'));
const Blog = React.lazy(() => import('@/pages/blog'));
const Demo = React.lazy(() => import('@/pages/demo'));

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Index} />
      <Route path="/home" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Landing pages */}
      <Route path="/about" component={About} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/contact" component={Contact} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/security" component={() => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Security />
        </React.Suspense>
      )} />
      <Route path="/cookies" component={() => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Cookies />
        </React.Suspense>
      )} />
      <Route path="/roadmap" component={() => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Roadmap />
        </React.Suspense>
      )} />
      <Route path="/careers" component={() => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Careers />
        </React.Suspense>
      )} />
      <Route path="/blog" component={() => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Blog />
        </React.Suspense>
      )} />
      <Route path="/demo" component={() => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Demo />
        </React.Suspense>
      )} />
      
      {/* Protected routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/builder" component={Builder} />
      <Route path="/builder/:id" component={Builder} />
      <Route path="/templates" component={Templates} />
      
      {/* AI Features */}
      <Route path="/ai/langchain" component={() => (
        <AppLayout title="LangChain Integration" requireAuth={false}>
          <LangChainPage />
        </AppLayout>
      )} />
      <Route path="/ai/ocr" component={() => 
        <ComingSoon title="OCR Features" description="Advanced document processing with intelligent OCR capabilities coming soon." />
      } />
      <Route path="/ai/scraper" component={ScraperPage} />
      <Route path="/ai/agent-protocols" component={AgentProtocols} />
      <Route path="/ai/guardrails" component={() => (
        <AppLayout title="Guardrails Configuration" requireAuth={false}>
          <GuardrailsPage />
        </AppLayout>
      )} />
      <Route path="/ai/test-protocols" component={TestProtocols} />
      <Route path="/ai/simple-protocols" component={SimpleProtocols} />
      <Route path="/ai/runtime-dashboard" component={RuntimeDashboard} />
      <Route path="/ai/memory-dashboard" component={MemoryDashboard} />
      <Route path="/ai/rag-db-switch" component={RagDbSwitch} />
      <Route path="/ai/langflow" component={() => (
        <AppLayout title="Langflow Integration" requireAuth={false}>
          <LangflowSettings />
        </AppLayout>
      )} />
      <Route path="/ai/langflow-editor" component={() => (
        <AppLayout title="Langflow Editor" requireAuth={false}>
          <LangflowEditor />
        </AppLayout>
      )} />
      
      {/* OSINT & Social Monitoring */}
      <Route path="/social-monitoring" component={SocialMonitoring} />
      <Route path="/social-monitoring/new" component={SocialMonitoringNew} />
      <Route path="/social-connectors" component={() => <SocialConnectors />} />
      <Route path="/osint" component={Osint} />
      
      {/* Settings & Integrations */}
      <Route path="/settings" component={() => 
        <ComingSoon title="User Preferences" description="User preferences and settings configuration will be available soon." />
      } />
      <Route path="/integrations" component={Integrations} />
      <Route path="/oidc-providers" component={OIDCProviders} />
      <Route path="/executions" component={Executions} />
      <Route path="/executions/:id" component={ExecutionDetails} />
      <Route path="/workflow-executions/:id" component={WorkflowExecution} />
      <Route path="/workflow-visualization-demo" component={WorkflowVisualizationDemo} />
      
      {/* Telemetry & Monitoring */}
      <Route path="/telemetry" component={TelemetryDashboard} />
      <Route path="/activity-log" component={ActivityLog} />
      
      {/* Usage & Billing */}
      <Route path="/usage" component={UsagePage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/settings/billing" component={BillingPage} />
      
      {/* Fallback to 404 */}
      <Route path="/:rest*">
        {(params) => <NotFound />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
