import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema
} from "@shared/schema";
import './types';
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import multer from "multer";
import { OCRService, DocumentType } from "./services/ocr";
import { ScraperService, SiteType, ScraperEngine } from "./services/scraper";
import { Agent, AgentFactory, AgentType } from "./services/agent";
import { AgentToolkit } from "./services/agent-toolkit";
import { 
  IntegrationService, IntegrationType, AuthType, HttpMethod, 
  ContentType, OAuth2Service 
} from "./services/integration";
import { SocialMonitoringService } from "./services/social/SocialMonitoringService";
// Instantiate the social monitoring service using the storage instance
const socialMonitorService = new SocialMonitoringService();
import { RecommendationEngine, recommendationEngine } from "./services/recommendation-engine";
import { OpenIDConnectService } from "./services/openid-connect";
import axios from "axios";
import * as cheerio from "cheerio";
import { OsintService, OsintSourceType } from "./services/osint";
import { 
  WorkflowExecutor, 
  startWorkflowExecution, 
  pauseWorkflowExecution, 
  resumeWorkflowExecution,
  cancelWorkflowExecution,
  executionRegistry,
  onEvent,
  emitEvent,
  WebSocketEvent
} from "./services/workflow-executor";
import { WebSocketServer, WebSocket } from 'ws';
// Import WebSocketHandler with default export
import webSocketHandler from './services/workflow/WebSocketHandler';
import workflowRoutes from "./routes/workflow";
import usageRoutes from "./routes/usage-routes";
import subscriptionRoutes from "./routes/subscription-routes";
import socialRoutes from "./routes/social-routes";
import scrapingRoutes from "./routes/scraping-routes";
import agentRoutes from "./routes/agent-routes";
import guardrailsRoutes from "./routes/guardrails-routes";
import searchRoutes from "./routes/search-routes";
import langflowRoutes from "./routes/langflow-routes";
import langchainRoutes from "./routes/langchain-routes";
import vectorDbRoutes from "./routes/vector-db-routes";
import { registerMemoryRoutes } from "./routes/memory-routes";
import ragRoutes from "./routes/rag-routes";
import ragImportRoutes from "./routes/rag-import-routes";
import activityLogRoutes from "./routes/activity-log-routes";
import userPreferencesRoutes from "./routes/user-preferences-routes";
import runtimeRoutes from "./routes/runtime-routes";
import executionRoutes from "./routes/execution-routes";
import { telemetryRouter } from "./routes/telemetry-routes";
import airbyteRoutes from "./routes/airbyte-routes";
import composioRoutes from "./routes/composio-routes";
import slackRoutes from "./routes/slack-routes";
import oauthRoutes from "./routes/oauth-routes";
import { 
  recordModelCost, 
  UsageType 
} from "./services/usage-tracking";

const sessionConfig = {
  secret: process.env.SESSION_SECRET || "synthralos-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
};

// Check if Stripe API key is set
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeApiKey ? new Stripe(stripeApiKey, { apiVersion: "2023-10-16" as any }) : undefined;

// Multer storage configuration for file uploads
const storage2 = multer.memoryStorage();
const upload = multer({ 
  storage: storage2,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Initialize services
const osintService = new OsintService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(session(sessionConfig));

  // Set up Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Incorrect email or password" });
          }

          // If user was registered with OAuth and has no password
          if (!user.password) {
            return done(null, false, { message: "Please login with your social account" });
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Incorrect email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password as string, 10);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as any;
      return res.json(userWithoutPassword);
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // User routes
  app.get("/api/users/me", isAuthenticated, (req, res) => {
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  app.put("/api/users/me", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const updatedUser = await storage.updateUser(user.id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Workflow routes
  app.get("/api/workflows", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const workflows = await storage.getWorkflowsByUser(user.id);
      res.json(workflows);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/workflows/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const workflow = await storage.getWorkflow(parseInt(id));
      
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      
      // Check if user has access to this workflow
      const user = req.user as any;
      if (workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/workflows", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertWorkflowSchema.parse({
        ...req.body,
        ownerId: user.id
      });
      
      const workflow = await storage.createWorkflow(validatedData);
      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/workflows/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      // Check if workflow exists and belongs to user
      const existingWorkflow = await storage.getWorkflow(parseInt(id));
      if (!existingWorkflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      
      if (existingWorkflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedWorkflow = await storage.updateWorkflow(parseInt(id), req.body);
      res.json(updatedWorkflow);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/workflows/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      // Check if workflow exists and belongs to user
      const existingWorkflow = await storage.getWorkflow(parseInt(id));
      if (!existingWorkflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      
      if (existingWorkflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteWorkflow(parseInt(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Workflow Execution routes
  app.get("/api/workflows/:id/executions", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      // Check if workflow exists and belongs to user
      const workflow = await storage.getWorkflow(parseInt(id));
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      
      if (workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const executions = await storage.getWorkflowExecutionsByWorkflow(parseInt(id));
      res.json(executions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/executions/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const executionId = parseInt(id);
      const user = req.user as any;
      
      // Get execution from database
      const execution = await storage.getWorkflowExecution(executionId);
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      
      // Get workflow to check permissions
      const workflow = await storage.getWorkflow(execution.workflowId);
      if (!workflow) {
        return res.status(404).json({ message: "Associated workflow not found" });
      }
      
      // Check permissions
      if (workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if this is an active execution
      const activeExecution = executionRegistry.get(executionId);
      if (activeExecution) {
        // Return the active execution state with real-time data
        const serializedExecution = {
          ...execution,
          activeState: {
            status: execution.status
          }
        };
        
        return res.json(serializedExecution);
      }
      
      // Return execution from database
      res.json(execution);
    } catch (error) {
      console.error("Error fetching execution:", error);
      res.status(500).json({ message: `Error fetching execution: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Get detailed execution history with results and logs
  // Get real-time execution status updates
  app.get("/api/executions/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const executionId = parseInt(id);
      const user = req.user as any;
      
      // Get execution from database to verify ownership
      const execution = await storage.getWorkflowExecution(executionId);
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      
      // Get workflow to check permissions
      const workflow = await storage.getWorkflow(execution.workflowId);
      if (!workflow || workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get the active execution state
      const activeExecution = executionRegistry.get(executionId);
      if (!activeExecution) {
        // Return static status if execution is no longer active
        return res.json({
          executionId,
          status: execution.status,
          isActive: false,
          currentNodes: [],
          completedNodes: execution.result ? JSON.parse(execution.result as string).completedNodes || [] : [],
          progress: 100, // Assuming completed
          startedAt: execution.startedAt,
          completedAt: execution.completedAt
        });
      }
      
      // Calculate progress percentage based on completed vs total nodes
      // This assumes the workflow data is available in the execution
      const workflowData = workflow.data as any;
      const totalNodes = workflowData.nodes ? workflowData.nodes.length : 0;
      const completedCount = activeExecution.completedNodes.length;
      const progress = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;
      
      // Return the real-time execution status
      res.json({
        executionId,
        status: activeExecution.status,
        isActive: true,
        currentNodes: activeExecution.currentNodes,
        completedNodes: activeExecution.completedNodes,
        progress,
        startedAt: activeExecution.startTime,
        completedAt: activeExecution.endTime,
        recentLogs: activeExecution.logs.slice(-10) // Last 10 log entries
      });
    } catch (error) {
      console.error("Error fetching execution status:", error);
      res.status(500).json({ message: `Error fetching execution status: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.get("/api/executions/:id/details", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const executionId = parseInt(id);
      const user = req.user as any;
      
      // Get execution from database
      const execution = await storage.getWorkflowExecution(executionId);
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      
      // Get workflow to check permissions
      const workflow = await storage.getWorkflow(execution.workflowId);
      if (!workflow) {
        return res.status(404).json({ message: "Associated workflow not found" });
      }
      
      // Check permissions
      if (workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if this is an active execution first
      const activeExecution = executionRegistry.get(executionId);
      if (activeExecution) {
        // For active executions, return the current state
        const serializedExecution = {
          execution: {
            id: execution.id,
            workflowId: execution.workflowId,
            status: activeExecution.status,
            startedAt: execution.startedAt,
            completedAt: null,
          },
          workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
          },
          result: null,
          logs: activeExecution.logs,
          activeState: {
            currentNodes: activeExecution.currentNodes,
            completedNodes: activeExecution.completedNodes,
            nodeResults: Object.fromEntries(activeExecution.nodeResults)
          }
        };
        
        return res.json(serializedExecution);
      }
      
      // For completed executions, get detailed history
      try {
        // Get execution details from database
        const executionDetails = {
          execution: execution,
          workflow: workflow,
          result: execution.result ? JSON.parse(execution.result as string) : null,
          logs: execution.logs || []
        };
        res.json(executionDetails);
      } catch (detailsError) {
        console.error("Error retrieving execution details:", detailsError);
        return res.status(500).json({ 
          message: `Error retrieving execution details: ${detailsError instanceof Error ? detailsError.message : 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error("Error fetching execution details:", error);
      res.status(500).json({ 
        message: `Error fetching execution details: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  app.post("/api/executions/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const executionId = parseInt(id);
      const user = req.user as any;
      
      // Get execution from database
      const execution = await storage.getWorkflowExecution(executionId);
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      
      // Get workflow to check permissions
      const workflow = await storage.getWorkflow(execution.workflowId);
      if (!workflow) {
        return res.status(404).json({ message: "Associated workflow not found" });
      }
      
      // Check permissions
      if (workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Cancel execution
      try {
        await cancelWorkflowExecution(executionId);
        return res.json({ success: true, message: "Execution cancelled successfully" });
      } catch (error) {
        return res.status(400).json({ message: "Execution cannot be cancelled (not active or already completed)" });
      }
    } catch (error) {
      console.error("Error cancelling execution:", error);
      res.status(500).json({ message: `Error cancelling execution: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  app.post("/api/executions/:id/pause", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const executionId = parseInt(id);
      const user = req.user as any;
      
      // Get execution from database
      const execution = await storage.getWorkflowExecution(executionId);
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      
      // Get workflow to check permissions
      const workflow = await storage.getWorkflow(execution.workflowId);
      if (!workflow) {
        return res.status(404).json({ message: "Associated workflow not found" });
      }
      
      // Check permissions
      if (workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Pause execution
      try {
        await pauseWorkflowExecution(executionId);
        return res.json({ success: true, message: "Execution paused successfully" });
      } catch (error) {
        return res.status(400).json({ message: "Execution cannot be paused (not active or already completed)" });
      }
    } catch (error) {
      console.error("Error pausing execution:", error);
      res.status(500).json({ message: `Error pausing execution: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  app.post("/api/executions/:id/resume", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const executionId = parseInt(id);
      const user = req.user as any;
      
      // Get execution from database
      const execution = await storage.getWorkflowExecution(executionId);
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      
      // Get workflow to check permissions
      const workflow = await storage.getWorkflow(execution.workflowId);
      if (!workflow) {
        return res.status(404).json({ message: "Associated workflow not found" });
      }
      
      // Check permissions
      if (workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Resume execution
      try {
        await resumeWorkflowExecution(executionId);
        return res.json({ success: true, message: "Execution resumed successfully" });
      } catch (error) {
        return res.status(400).json({ message: "Execution cannot be resumed (not paused or already completed)" });
      }
    } catch (error) {
      console.error("Error resuming execution:", error);
      res.status(500).json({ message: `Error resuming execution: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.post("/api/workflows/:id/execute", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      // Check if workflow exists and belongs to user
      const workflow = await storage.getWorkflow(parseInt(id));
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      
      if (workflow.ownerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Start workflow execution
      const workflowId = parseInt(id);
      const userId = user.id;
      
      // Function to send WebSocket events through the initialized WebSocketHandler
      const sendWebSocketEvent = (event: WebSocketEvent) => {
        // Extract the executionId from the data field if present
        const executionId = (event.data && typeof event.data === 'object' && 'executionId' in event.data) 
          ? event.data.executionId 
          : undefined;
        
        if (executionId) {
          webSocketHandler.sendExecutionEvent(executionId, event);
        } else {
          console.warn('[websocket] Received event without executionId:', event);
        }
      };
      
      const executionId = await startWorkflowExecution(workflowId, userId, sendWebSocketEvent);
      
      // Get the execution record
      const execution = await storage.getWorkflowExecution(executionId);
      
      res.status(202).json(execution);
    } catch (error) {
      console.error("Error executing workflow:", error);
      res.status(500).json({ message: `Error executing workflow: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // API Integration routes
  app.get("/api/integrations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const integrations = await storage.getApiIntegrationsByUser(user.id);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/integrations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertApiIntegrationSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      const integration = await storage.createApiIntegration(validatedData);
      res.status(201).json(integration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/integrations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const integration = await storage.getApiIntegration(parseInt(id));
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      
      if (integration.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(integration);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/integrations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const integration = await storage.getApiIntegration(parseInt(id));
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      
      if (integration.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteApiIntegration(parseInt(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/integrations/:id/execute", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { endpoint, method, params, data, headers, contentType } = req.body;
      const user = req.user as any;
      
      // Get integration details
      const integration = await storage.getApiIntegration(parseInt(id));
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      
      if (integration.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Parse integration config from stored data
      const config = JSON.parse(integration.config);
      
      // Execute request
      const result = await IntegrationService.executeRequest(config, {
        endpoint,
        method: method || HttpMethod.GET,
        params,
        data,
        headers,
        contentType: contentType || ContentType.JSON
      });
      
      // Log model usage if it's an AI API
      if (config.isAiApi) {
        await storage.createModelCostLog({
          userId: user.id,
          model: config.name,
          requestType: 'integration',
          tokensUsed: Math.ceil((JSON.stringify(data || '').length + JSON.stringify(result.data || '').length) / 4),
          cost: 0.0001 * Math.ceil((JSON.stringify(data || '').length + JSON.stringify(result.data || '').length) / 1000),
          metadata: JSON.stringify({
            endpoint,
            dataSize: JSON.stringify(data || '').length,
            responseSize: JSON.stringify(result.data || '').length
          })
        } as any);
      }
      
      res.json(result);
    } catch (error) {
      console.error("API execution error:", error);
      res.status(500).json({ message: `Failed to execute API request: ${error}` });
    }
  });
  
  // OAuth2 endpoints for third-party service integrations
  app.get("/api/integrations/:id/oauth2/authorize", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { redirectUri } = req.query;
      const user = req.user as any;
      
      if (!redirectUri) {
        return res.status(400).json({ message: "Missing redirect URI" });
      }
      
      // Get integration details
      const integration = await storage.getApiIntegration(parseInt(id));
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      
      if (integration.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Parse integration config from stored data
      const config = JSON.parse(integration.config);
      
      if (config.auth.type !== AuthType.OAUTH2) {
        return res.status(400).json({ message: "Integration is not configured for OAuth2" });
      }
      
      // Generate state for CSRF protection
      const state = uuidv4();
      
      // Generate authorization URL
      const authUrl = OAuth2Service.getAuthorizationUrl(
        config,
        redirectUri as string,
        state,
        config.auth.oauth?.scope
      );
      
      if (!authUrl) {
        return res.status(400).json({ message: "Failed to generate authorization URL" });
      }
      
      res.json({ authUrl, state });
    } catch (error) {
      console.error("OAuth2 authorization error:", error);
      res.status(500).json({ message: `OAuth2 authorization failed: ${error}` });
    }
  });
  
  app.post("/api/integrations/:id/oauth2/token", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { code, redirectUri, state } = req.body;
      const user = req.user as any;
      
      if (!code || !redirectUri || !state) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      // Get integration details
      const integration = await storage.getApiIntegration(parseInt(id));
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      
      if (integration.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Parse integration config from stored data
      const config = JSON.parse(integration.config);
      
      if (config.auth.type !== AuthType.OAUTH2) {
        return res.status(400).json({ message: "Integration is not configured for OAuth2" });
      }
      
      // Exchange code for tokens
      const tokens = await OAuth2Service.exchangeCodeForTokens(
        config,
        code,
        redirectUri
      );
      
      if (!tokens) {
        return res.status(400).json({ message: "Failed to exchange code for tokens" });
      }
      
      // Update integration with new tokens
      const updatedConfig = {
        ...config,
        auth: {
          ...config.auth,
          oauth: {
            ...config.auth.oauth,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt
          }
        }
      };
      
      await storage.updateApiIntegration(integration.id, {
        config: JSON.stringify(updatedConfig)
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("OAuth2 token exchange error:", error);
      res.status(500).json({ message: `OAuth2 token exchange failed: ${error}` });
    }
  });
  
  app.get("/api/integration-types", (req, res) => {
    const types = Object.values(IntegrationType);
    res.json(types);
  });
  
  app.get("/api/integration-auth-types", (req, res) => {
    const types = Object.values(AuthType);
    res.json(types);
  });

  // Workflow Templates routes
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getAllWorkflowTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getWorkflowTemplate(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // OCR routes
  app.post("/api/ocr/process", isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Check file size for routing decisions
      const fileSize = req.file.size;
      const isPdf = req.file.mimetype === 'application/pdf';
      
      // Get options from request body
      const options = {
        language: req.body.language || 'eng',
        documentType: req.body.documentType as DocumentType || DocumentType.GENERIC,
        engine: req.body.engine as any || undefined,
        enhanceImage: req.body.enhanceImage === 'true',
        confidence: req.body.confidence ? parseFloat(req.body.confidence) : 0.7,
        hasHandwriting: req.body.hasHandwriting === 'true',
        region: req.body.region || undefined,
        isPdf,
        fileSize,
        structuredJsonRequired: req.body.structuredJsonRequired === 'true',
        latency: req.body.latency ? parseInt(req.body.latency) : undefined
      };
      
      // Process image with OCR
      const result = await OCRService.processImage(req.file.buffer, options);
      
      // Log model usage
      const userId = (req.user as any).id;
      await storage.createModelCostLog({
        userId,
        model: result.engineUsed,
        requestType: 'ocr',
        tokensUsed: Math.ceil(result.text.length / 4), // Rough estimation
        cost: 0.0001 * Math.ceil(result.text.length / 100), // Approximate cost
        metadata: JSON.stringify({
          documentType: options.documentType,
          language: options.language,
          characters: result.text.length,
          engine: result.engineUsed,
          processingTime: result.executionTime
        })
      });
      
      res.json(result);
    } catch (error) {
      console.error("OCR processing error:", error);
      res.status(500).json({ message: `OCR processing failed: ${error}` });
    }
  });
  
  app.get("/api/ocr/document-types", (req, res) => {
    const documentTypes = Object.values(DocumentType);
    res.json(documentTypes);
  });
  
  app.get("/api/ocr/engines", (req, res) => {
    const engines = Object.values(OCREngine);
    res.json(engines);
  });
  
  app.get("/api/ocr/engines/info", (req, res) => {
    const engineInfo = [
      {
        name: OCREngine.TESSERACT,
        description: "General-purpose OCR engine for most text extraction needs",
        benefits: ["Open source", "Good general accuracy", "Supports many languages"],
        limitations: ["Struggles with complex layouts", "Not optimized for handwriting"],
        bestFor: [DocumentType.GENERIC, DocumentType.FORM]
      },
      {
        name: OCREngine.PADDLE_OCR,
        description: "Specialized OCR engine with better layout analysis",
        benefits: ["Better with complex documents", "Good for structured forms", "Regional fallback"],
        limitations: ["Requires more resources", "Can be slower than Tesseract"],
        bestFor: [DocumentType.INVOICE, DocumentType.RECEIPT, DocumentType.ID_CARD, DocumentType.BUSINESS_CARD]
      },
      {
        name: OCREngine.EASY_OCR,
        description: "OCR engine optimized for handwriting recognition",
        benefits: ["Specialized for handwritten text", "Good with varied penmanship", "Multiple language support"],
        limitations: ["Not as good for printed text", "Can be slower"],
        bestFor: ["Handwritten notes", "Forms with handwriting"]
      },
      {
        name: OCREngine.GOOGLE_VISION,
        description: "Cloud-based OCR with advanced capabilities",
        benefits: ["High accuracy", "Handles complex documents", "Good for PDFs"],
        limitations: ["Cloud-based", "Rate limits may apply"],
        bestFor: ["Heavy PDFs", "Large images", "Complex multi-page documents"]
      },
      {
        name: OCREngine.OMNIPARSER,
        description: "Specialized parser for structured documents",
        benefits: ["JSON output", "Table extraction", "Data normalization"],
        limitations: ["Specialized use cases", "Not for general OCR"],
        bestFor: [DocumentType.TABLE, "Structured data extraction"]
      }
    ];
    
    res.json(engineInfo);
  });
  
  // Web Scraping routes
  app.post("/api/scraper/analyze-url", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      // Perform a quick analysis using Cheerio (lightweight)
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SynthralOS/1.0; +https://synthral.com/bot)' },
          timeout: 5000
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        // Detect site type
        let detectedSiteType = SiteType.GENERIC;
        
        // Check if the page might be a SPA
        const hasReactJS = html.includes('reactjs') || html.includes('react.js') || html.includes('react-dom');
        const hasVueJS = html.includes('vue.js') || html.includes('vuejs') || html.includes('vue@');
        const hasAngular = html.includes('angular.js') || html.includes('angularjs') || html.includes('ng-app');
        
        if (hasReactJS || hasVueJS || hasAngular) {
          detectedSiteType = SiteType.SPA;
        }
        
        // Check if it's an e-commerce site
        const hasAddToCart = html.toLowerCase().includes('add to cart') || 
                             html.toLowerCase().includes('buy now') ||
                             $('[itemtype="http://schema.org/Product"]').length > 0;
        
        if (hasAddToCart) {
          detectedSiteType = SiteType.E_COMMERCE;
        }
        
        // Check if it's a social media page
        const isSocialMedia = url.includes('facebook.com') || 
                               url.includes('twitter.com') || 
                               url.includes('instagram.com') ||
                               url.includes('linkedin.com') ||
                               url.includes('tiktok.com');
                               
        if (isSocialMedia) {
          detectedSiteType = SiteType.SOCIAL_MEDIA;
        }
        
        // Check if it's a news site
        const hasArticleSchema = $('[itemtype="http://schema.org/NewsArticle"]').length > 0 ||
                                $('[itemtype="http://schema.org/Article"]').length > 0;
        const hasNewsKeywords = $('meta[name="keywords"]').attr('content')?.toLowerCase().includes('news') || false;
        
        if (hasArticleSchema || hasNewsKeywords) {
          detectedSiteType = SiteType.NEWS;
        }
        
        // Determine recommended engine
        const recommendedEngine = ScraperService.selectEngineForSiteType(detectedSiteType, {
          javascriptRendering: hasReactJS || hasVueJS || hasAngular
        });
        
        // Get page metadata
        const title = $('title').text().trim();
        const description = $('meta[name="description"]').attr('content') || '';
        const links = $('a').length;
        const images = $('img').length;
        const scripts = $('script').length;
        
        // Return analysis results
        res.json({
          url,
          title,
          description,
          detectedSiteType,
          recommendedEngine,
          metadata: {
            links,
            images,
            scripts,
            hasJavascriptFramework: hasReactJS || hasVueJS || hasAngular,
            contentType: response.headers['content-type'] || ''
          }
        });
      } catch (error) {
        res.status(500).json({ message: `URL analysis failed: ${error}` });
      }
    } catch (error) {
      res.status(500).json({ message: `URL analysis failed: ${error}` });
    }
  });

  app.post("/api/scraper/scrape", isAuthenticated, async (req, res) => {
    try {
      const { url, selectors, siteType, engine, javascriptRendering, pagination } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      
      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      // Configure options
      const options: any = {
        selectors: selectors || {},
        siteType: siteType || SiteType.GENERIC,
        engine: engine || undefined,
        javascriptRendering: javascriptRendering === true,
        pagination: pagination || { enabled: false }
      };
      
      // Process scraping
      const result = await ScraperService.scrape(url, options);
      
      // Log model usage
      const userId = (req.user as any).id;
      await storage.createModelCostLog({
        userId,
        model: result.metadata.engineUsed,
        tokensInput: 0,
        tokensOutput: Math.ceil(result.text?.length || 1000), // Rough estimation
        cost: 0.0001 * Math.ceil((result.text?.length || 1000) / 1000), // Approximate cost
        metadata: JSON.stringify({
          url,
          siteType: options.siteType,
          dataSize: result.text?.length || 0
        })
      } as any);
      
      // Create a response with limited HTML content to reduce payload size
      const response = {
        url: result.url,
        title: result.title,
        text: result.text || '',
        data: result.data,
        metadata: result.metadata,
        html_preview: result.text ? result.text.substring(0, 1000) + '... (truncated)' : 'No text content extracted'
      };
      
      res.json(response);
    } catch (error) {
      console.error("Web scraping error:", error);
      res.status(500).json({ message: `Web scraping failed: ${error}` });
    }
  });
  
  app.get("/api/scraper/site-types", (req, res) => {
    const siteTypes = Object.values(SiteType);
    res.json(siteTypes);
  });
  
  app.get("/api/scraper/engines", (req, res) => {
    const engines = Object.values(ScraperEngine);
    res.json(engines);
  });
  
  app.get("/api/scraper/engines/info", (req, res) => {
    const engineInfo = [
      {
        name: ScraperEngine.CHEERIO,
        description: "Lightweight and fast static HTML parser",
        benefits: ["Fast parsing", "Low resource usage", "Good for static sites"],
        limitations: ["Cannot process JavaScript", "No DOM interaction"],
        bestFor: [SiteType.GENERIC, SiteType.NEWS]
      },
      {
        name: ScraperEngine.JSDOM,
        description: "Server-side DOM implementation for more accurate parsing",
        benefits: ["Full DOM API", "Better CSS selector support", "More accurate than Cheerio"],
        limitations: ["Limited JavaScript support", "Higher resource usage than Cheerio"],
        bestFor: [SiteType.NEWS, SiteType.FORUM]
      },
      {
        name: ScraperEngine.PUPPETEER,
        description: "Headless browser for fully rendered content with JavaScript",
        benefits: ["Full JavaScript support", "Renders pages like a real browser", "Can interact with the page"],
        limitations: ["Higher resource usage", "Slower than static parsers"],
        bestFor: [SiteType.SPA, SiteType.SOCIAL_MEDIA]
      },
      {
        name: ScraperEngine.CRAWL4AI,
        description: "Advanced intelligent extraction combining multiple techniques",
        benefits: ["Structured data extraction", "Combines multiple engines", "Optimized for e-commerce"],
        limitations: ["Higher resource usage", "More complex configuration"],
        bestFor: [SiteType.E_COMMERCE, SiteType.JOB_BOARD]
      },
    ];
    
    res.json(engineInfo);
  });
  
  // Agent framework routes
  // Store agents in memory for simplicity
  // In a real implementation, you'd store agent state in the database
  const agentInstances = new Map<string, Agent>();
  
  app.post("/api/agents/create", isAuthenticated, async (req, res) => {
    try {
      const { agentType, capabilities, systemPrompt, maxTokens, temperature, toolNames } = req.body;
      
      if (!agentType || !Object.values(AgentType).includes(agentType)) {
        return res.status(400).json({ message: "Invalid agent type" });
      }
      
      // Get requested tools
      const tools = toolNames && toolNames.length > 0
        ? AgentToolkit.getTools(toolNames)
        : [];
      
      // Create agent ID
      const agentId = uuidv4();
      const userId = (req.user as any).id;
      
      // Create agent based on type
      let agent: Agent;
      
      switch (agentType) {
        case AgentType.ASSISTANT:
          agent = AgentFactory.createAssistant({ systemPrompt, maxTokens, temperature, tools });
          break;
        case AgentType.RESEARCHER:
          agent = AgentFactory.createResearcher({ systemPrompt, maxTokens, temperature, tools });
          break;
        case AgentType.ANALYZER:
          agent = AgentFactory.createAnalyzer({ systemPrompt, maxTokens, temperature, tools });
          break;
        case AgentType.EXECUTOR:
          agent = AgentFactory.createExecutor({ systemPrompt, maxTokens, temperature, tools });
          break;
        case AgentType.COORDINATOR:
          agent = AgentFactory.createCoordinator({ systemPrompt, maxTokens, temperature, tools });
          break;
        case AgentType.SPECIALIST:
          if (!capabilities?.specialization) {
            return res.status(400).json({ message: "Specialization is required for specialist agents" });
          }
          agent = AgentFactory.createSpecialist(capabilities.specialization, { systemPrompt, maxTokens, temperature, tools });
          break;
        case AgentType.AUTONOMOUS:
          agent = AgentFactory.createAutonomous({ systemPrompt, maxTokens, temperature, tools });
          break;
        default:
          return res.status(400).json({ message: "Unsupported agent type" });
      }
      
      // Store agent instance
      agentInstances.set(agentId, agent);
      
      res.status(201).json({
        agentId,
        agentType,
        capabilities,
        toolNames: toolNames || [],
        created: new Date().toISOString()
      });
    } catch (error) {
      console.error("Agent creation error:", error);
      res.status(500).json({ message: `Failed to create agent: ${error}` });
    }
  });
  
  app.post("/api/agents/:agentId/query", isAuthenticated, async (req, res) => {
    try {
      const { agentId } = req.params;
      const { query, context } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }
      
      // Get agent instance
      const agent = agentInstances.get(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Process query
      const result = await agent.process(query, context);
      
      // Log model usage
      const userId = (req.user as any).id;
      await storage.createModelCostLog({
        userId,
        model: 'claude-3-7-sonnet-20250219',
        tokensInput: Math.ceil(query.length / 4),
        tokensOutput: Math.ceil(result.response.length / 4),
        cost: 0.0001 * (Math.ceil(query.length / 1000) + Math.ceil(result.response.length / 1000)),
        metadata: JSON.stringify({
          agentId,
          queryLength: query.length,
          responseLength: result.response.length
        })
      } as any);
      
      res.json(result);
    } catch (error) {
      console.error("Agent query error:", error);
      res.status(500).json({ message: `Agent query failed: ${error}` });
    }
  });
  
  app.delete("/api/agents/:agentId", isAuthenticated, (req, res) => {
    try {
      const { agentId } = req.params;
      
      // Check if agent exists
      if (!agentInstances.has(agentId)) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Delete agent
      agentInstances.delete(agentId);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/agents/types", (req, res) => {
    const agentTypes = Object.values(AgentType);
    res.json(agentTypes);
  });
  
  app.get("/api/agents/tools", (req, res) => {
    const tools = AgentToolkit.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
    res.json(tools);
  });

  // Stripe Subscription routes
  if (stripe) {
    app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
      try {
        const { amount } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: "usd",
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error: any) {
        res
          .status(500)
          .json({ message: "Error creating payment intent: " + error.message });
      }
    });

    app.post('/api/get-or-create-subscription', isAuthenticated, async (req, res) => {
      try {
        const user = req.user as any;

        if (user.stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

          return res.send({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
          });
        }
        
        if (!user.email) {
          throw new Error('No user email on file');
        }

        // Create or get customer
        let customerId = user.stripeCustomerId;
        
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name || user.username,
          });
          
          customerId = customer.id;
          await storage.updateStripeCustomerId(user.id, customerId);
        }

        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{
            // We're using the default price but in production you should use a specific price ID
            price: process.env.STRIPE_PRICE_ID || 'price_1234', // This should be set by the user
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        await storage.updateUserStripeInfo(user.id, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id
        });
    
        res.send({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      } catch (error: any) {
        return res.status(400).send({ error: { message: error.message } });
      }
    });
  }

  // Workflow Recommendation routes
  app.get("/api/recommendations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const recommendations = await storage.getWorkflowRecommendationsByUser(user.id);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Error fetching recommendations", error: (error as Error).message });
    }
  });

  app.get("/api/recommendations/organization/:orgId", isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const organizationId = parseInt(orgId);
      const recommendations = await storage.getWorkflowRecommendationsByOrg(organizationId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching org recommendations:", error);
      res.status(500).json({ message: "Error fetching organization recommendations", error: (error as Error).message });
    }
  });

  app.post("/api/recommendations/generate", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { orgId } = req.body;
      
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({ 
          message: "Anthropic API key is missing. Please set the ANTHROPIC_API_KEY environment variable." 
        });
      }

      const recommendations = await recommendationEngine.generateAndSaveRecommendationsForUser(
        user.id, 
        orgId ? parseInt(orgId) : undefined
      );
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Error generating recommendations", error: (error as Error).message });
    }
  });

  app.patch("/api/recommendations/:id/mark-read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      // Check if recommendation exists and belongs to user
      const recommendation = await storage.getWorkflowRecommendation(parseInt(id));
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      
      if (recommendation.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedRecommendation = await storage.markRecommendationAsRead(parseInt(id));
      res.json(updatedRecommendation);
    } catch (error) {
      console.error("Error marking recommendation as read:", error);
      res.status(500).json({ message: "Error updating recommendation", error: (error as Error).message });
    }
  });

  app.patch("/api/recommendations/:id/mark-clicked", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      // Check if recommendation exists and belongs to user
      const recommendation = await storage.getWorkflowRecommendation(parseInt(id));
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      
      if (recommendation.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedRecommendation = await storage.markRecommendationAsClicked(parseInt(id));
      res.json(updatedRecommendation);
    } catch (error) {
      console.error("Error marking recommendation as clicked:", error);
      res.status(500).json({ message: "Error updating recommendation", error: (error as Error).message });
    }
  });

  app.post("/api/user-activity", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { workflowId, templateId, activityType, metadata } = req.body;
      
      const activity = await storage.logUserWorkflowActivity({
        userId: user.id,
        workflowId: workflowId ? parseInt(workflowId) : undefined,
        templateId: templateId ? parseInt(templateId) : undefined,
        activityType,
        metadata: metadata || {}
      });
      
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error logging user activity:", error);
      res.status(500).json({ message: "Error logging activity", error: (error as Error).message });
    }
  });

  // OSINT routes
  app.post("/api/osint/search", isAuthenticated, async (req, res) => {
    try {
      const { term, sources, timeframe, limit } = req.body;
      
      if (!term) {
        return res.status(400).json({ message: "Search term is required" });
      }

      const results = await osintService.search({
        term,
        sources,
        timeframe,
        limit
      });

      res.json(results);
    } catch (error) {
      console.error("OSINT search error:", error);
      res.status(500).json({ message: "Error performing OSINT search", error: (error as Error).message });
    }
  });

  app.post("/api/osint/person", isAuthenticated, async (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Person name is required" });
      }

      const results = await osintService.personLookup(name);
      res.json(results);
    } catch (error) {
      console.error("Person lookup error:", error);
      res.status(500).json({ message: "Error performing person lookup", error: (error as Error).message });
    }
  });

  app.post("/api/osint/company", isAuthenticated, async (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Company name is required" });
      }

      const results = await osintService.companyLookup(name);
      res.json(results);
    } catch (error) {
      console.error("Company lookup error:", error);
      res.status(500).json({ message: "Error performing company lookup", error: (error as Error).message });
    }
  });

  app.post("/api/osint/sentiment", isAuthenticated, async (req, res) => {
    try {
      const { term, platforms } = req.body;
      
      if (!term) {
        return res.status(400).json({ message: "Term is required" });
      }

      const results = await osintService.analyzeSentiment(term, platforms);
      res.json(results);
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      res.status(500).json({ message: "Error performing sentiment analysis", error: (error as Error).message });
    }
  });

  // Social Monitor routes
  app.get("/api/social-monitors", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // First try to fetch from database
      try {
        const dbMonitors = await storage.getSocialMonitorsByUser(user.id);
        
        // Convert database monitors to format expected by the frontend
        const monitors = dbMonitors.map(dbMonitor => {
          // Extract data from the query JSON field
          const query = dbMonitor.query as any || {};
          const keywords = query.keywords || [];
          const platforms = query.platforms || [];
          
          return {
            id: dbMonitor.id.toString(),
            name: dbMonitor.name,
            description: query.description || '',
            userId: dbMonitor.userId,
            platforms,
            keywords,
            frequency: parseInt(dbMonitor.frequency) || 60,
            alertThreshold: query.alertThreshold || 0.7,
            isActive: dbMonitor.status === 'active',
            createdAt: dbMonitor.createdAt,
            lastRunAt: dbMonitor.lastRunAt
          };
        });
        
        res.json(monitors);
      } catch (dbError) {
        console.error("Database fetch failed, falling back to service:", dbError);
        
        // Fallback to service
        const monitors = socialMonitorService.getMonitorsByUser(user.id);
        res.json(monitors);
      }
    } catch (error) {
      console.error("Error fetching social monitors:", error);
      res.status(500).json({ message: "Error fetching social monitors", error: (error as Error).message });
    }
  });

  app.post("/api/social-monitors", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { name, description, platforms, keywords, accounts, frequency, alertThreshold, isActive } = req.body;
      
      if (!name || !platforms || !keywords) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // First try to use the database storage
      try {
        // Convert data from frontend format to database format
        const insertData: any = {
          userId: user.id,
          name,
          type: 'keyword',
          connectorId: 1, // Default connector
          query: {
            keywords,
            platforms,
            accounts: accounts || [],
            description: description || "",
            alertThreshold: alertThreshold || 0.7,
          },
          frequency: (frequency || 60).toString(),
          status: isActive !== false ? 'active' : 'inactive',
        };
        
        const dbMonitor = await storage.createSocialMonitor(insertData);
        
        // Convert back to frontend format for response
        const monitor = {
          id: dbMonitor.id.toString(),
          name: dbMonitor.name,
          description: description || '',
          userId: dbMonitor.userId,
          platforms,
          keywords,
          accounts: accounts || [],
          frequency: parseInt(dbMonitor.frequency) || 60,
          alertThreshold: alertThreshold || 0.7,
          isActive: dbMonitor.status === 'active',
          createdAt: dbMonitor.createdAt,
          lastRunAt: dbMonitor.lastRunAt
        };
        
        res.status(201).json(monitor);
      } catch (dbError) {
        console.error("Database storage failed, falling back to service:", dbError);
        
        // Fallback to the social monitor service
        const monitor = socialMonitorService.createMonitor({
          name,
          description,
          userId: user.id,
          platforms,
          keywords,
          accounts,
          frequency,
          alertThreshold,
          isActive: isActive !== false
        });

        res.status(201).json(monitor);
      }
    } catch (error) {
      console.error("Error creating social monitor:", error);
      res.status(500).json({ message: "Error creating social monitor", error: (error as Error).message });
    }
  });

  app.get("/api/social-monitors/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const monitor = socialMonitorService.getMonitor(id);
      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }
      
      if (monitor.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(monitor);
    } catch (error) {
      console.error("Error fetching social monitor:", error);
      res.status(500).json({ message: "Error fetching social monitor", error: (error as Error).message });
    }
  });

  app.put("/api/social-monitors/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const monitor = socialMonitorService.getMonitor(id);
      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }
      
      if (monitor.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedMonitor = socialMonitorService.updateMonitor(id, req.body);
      res.json(updatedMonitor);
    } catch (error) {
      console.error("Error updating social monitor:", error);
      res.status(500).json({ message: "Error updating social monitor", error: (error as Error).message });
    }
  });

  app.delete("/api/social-monitors/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const monitor = socialMonitorService.getMonitor(id);
      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }
      
      if (monitor.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      socialMonitorService.deleteMonitor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting social monitor:", error);
      res.status(500).json({ message: "Error deleting social monitor", error: (error as Error).message });
    }
  });

  app.post("/api/social-monitors/:id/run", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const monitor = socialMonitorService.getMonitor(id);
      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }
      
      if (monitor.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await socialMonitorService.runMonitor(id);
      res.json(result);
    } catch (error) {
      console.error("Error running social monitor:", error);
      res.status(500).json({ message: "Error running social monitor", error: (error as Error).message });
    }
  });

  app.get("/api/social-monitors/:id/alerts", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const monitor = socialMonitorService.getMonitor(id);
      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }
      
      if (monitor.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const alerts = await socialMonitorService.getAlerts(id, limit);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching social alerts:", error);
      res.status(500).json({ message: "Error fetching social alerts", error: (error as Error).message });
    }
  });
  
  // Create demo monitors for new users
  app.post("/api/social-monitors/demo", isAuthenticated, (req, res) => {
    try {
      const user = req.user as any;
      const demoMonitors = socialMonitorService.createDemoMonitors(user.id);
      res.json(demoMonitors);
    } catch (error) {
      console.error("Error creating demo monitors:", error);
      res.status(500).json({ message: "Error creating demo monitors", error: (error as Error).message });
    }
  });

  // OIDC Provider routes
  app.get("/api/oidc-providers", isAuthenticated, async (req, res) => {
    try {
      const providers = await storage.getAllOidcProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching OIDC providers:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/oidc-providers", isAuthenticated, async (req, res) => {
    try {
      const provider = await storage.createOidcProvider(req.body);
      res.status(201).json(provider);
    } catch (error) {
      console.error("Error creating OIDC provider:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/oidc-providers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const provider = await storage.getOidcProvider(parseInt(id));
      
      if (!provider) {
        return res.status(404).json({ message: "OIDC provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Error fetching OIDC provider:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/oidc-providers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const provider = await storage.updateOidcProvider(parseInt(id), req.body);
      
      if (!provider) {
        return res.status(404).json({ message: "OIDC provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Error updating OIDC provider:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/oidc-providers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.deleteOidcProvider(parseInt(id));
      
      if (!result) {
        return res.status(404).json({ message: "OIDC provider not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting OIDC provider:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Organization endpoints
  app.get("/api/organizations", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const orgs = await storage.getOrganizationsByUser(userId);
      return res.json(orgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/organizations", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validatedData = insertOrganizationSchema.parse(req.body);
      
      // Check if slug is available
      const existingOrg = await storage.getOrganizationBySlug(validatedData.slug);
      if (existingOrg) {
        return res.status(400).json({ message: 'Organization slug already exists' });
      }
      
      // Create organization
      const newOrg = await storage.createOrganization({
        ...validatedData,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add creator as admin
      await storage.createOrganizationMember({
        organizationId: newOrg.id,
        userId,
        role: 'admin',
        joinedAt: new Date()
      });
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'organization.create',
        userId,
        organizationId: newOrg.id,
        entityType: 'organization',
        entityId: newOrg.id.toString(),
        details: { name: newOrg.name, slug: newOrg.slug },
        timestamp: new Date()
      });
      
      return res.status(201).json(newOrg);
    } catch (error) {
      console.error('Error creating organization:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/organizations/:id", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId || !id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if user is member of organization
      const member = await storage.getOrganizationMemberByUserAndOrg(userId, parseInt(id));
      if (!member) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const org = await storage.getOrganization(parseInt(id));
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      return res.json(org);
    } catch (error) {
      console.error('Error fetching organization:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch("/api/organizations/:id", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId || !id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if user is admin of organization
      const member = await storage.getOrganizationMemberByUserAndOrg(userId, parseInt(id));
      if (!member || member.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      const { name, description, logoUrl, settings } = req.body;
      
      const updatedOrg = await storage.updateOrganization(parseInt(id), {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(settings && { settings }),
        updatedAt: new Date()
      });
      
      if (!updatedOrg) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'organization.update',
        userId,
        organizationId: parseInt(id),
        entityType: 'organization',
        entityId: id,
        details: { changes: req.body },
        timestamp: new Date()
      });
      
      return res.json(updatedOrg);
    } catch (error) {
      console.error('Error updating organization:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete("/api/organizations/:id", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId || !id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if user is admin of organization
      const member = await storage.getOrganizationMemberByUserAndOrg(userId, parseInt(id));
      if (!member || member.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      const org = await storage.getOrganization(parseInt(id));
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      // Delete organization
      await storage.deleteOrganization(parseInt(id));
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'organization.delete',
        userId,
        organizationId: null,
        entityType: 'organization',
        entityId: id,
        details: { name: org.name, slug: org.slug },
        timestamp: new Date()
      });
      
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting organization:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/organizations/:id/members", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId || !id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if user is member of organization
      const member = await storage.getOrganizationMemberByUserAndOrg(userId, parseInt(id));
      if (!member) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const members = await storage.getOrganizationMembersByOrganization(parseInt(id));
      
      // Get user details for each member
      const memberDetails = await Promise.all(
        members.map(async (m) => {
          const user = await storage.getUser(m.userId);
          return {
            ...m,
            user: user ? {
              id: user.id,
              username: user.username,
              email: user.email,
              profileImageUrl: user.profileImageUrl
            } : null
          };
        })
      );
      
      return res.json(memberDetails);
    } catch (error) {
      console.error('Error fetching organization members:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/organizations/:id/members", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      const { memberUserId, role = 'member' } = req.body;
      
      if (!userId || !id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if user is admin of organization
      const member = await storage.getOrganizationMemberByUserAndOrg(userId, parseInt(id));
      if (!member || member.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      // Check if user to add exists
      const userToAdd = await storage.getUser(memberUserId);
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is already a member
      const existingMember = await storage.getOrganizationMemberByUserAndOrg(memberUserId, parseInt(id));
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this organization' });
      }
      
      // Add member
      const newMember = await storage.createOrganizationMember({
        organizationId: parseInt(id),
        userId: memberUserId,
        role,
        joinedAt: new Date()
      });
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'organization.addMember',
        userId,
        organizationId: parseInt(id),
        entityType: 'organizationMember',
        entityId: newMember.id.toString(),
        details: { memberId: memberUserId, role },
        timestamp: new Date()
      });
      
      return res.status(201).json(newMember);
    } catch (error) {
      console.error('Error adding organization member:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch("/api/organizations/:id/members/:memberId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id, memberId } = req.params;
      const { role } = req.body;
      
      if (!userId || !id || !memberId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if user is admin of organization
      const member = await storage.getOrganizationMemberByUserAndOrg(userId, parseInt(id));
      if (!member || member.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      // Get member to update
      const memberToUpdate = await storage.getOrganizationMember(parseInt(memberId));
      if (!memberToUpdate || memberToUpdate.organizationId !== parseInt(id)) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Update member
      const updatedMember = await storage.updateOrganizationMember(parseInt(memberId), {
        role
      });
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'organization.updateMember',
        userId,
        organizationId: parseInt(id),
        entityType: 'organizationMember',
        entityId: memberId,
        details: { role },
        timestamp: new Date()
      });
      
      return res.json(updatedMember);
    } catch (error) {
      console.error('Error updating organization member:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete("/api/organizations/:id/members/:memberId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id, memberId } = req.params;
      
      if (!userId || !id || !memberId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if user is admin of organization or removing self
      const member = await storage.getOrganizationMemberByUserAndOrg(userId, parseInt(id));
      const memberToDelete = await storage.getOrganizationMember(parseInt(memberId));
      
      if (!member || (member.role !== 'admin' && memberToDelete?.userId !== userId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      if (!memberToDelete || memberToDelete.organizationId !== parseInt(id)) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Cannot remove the last admin
      if (memberToDelete.role === 'admin') {
        const admins = (await storage.getOrganizationMembersByOrganization(parseInt(id)))
          .filter(m => m.role === 'admin');
        
        if (admins.length <= 1) {
          return res.status(400).json({ message: 'Cannot remove the last admin of an organization' });
        }
      }
      
      // Delete member
      await storage.deleteOrganizationMember(parseInt(memberId));
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'organization.removeMember',
        userId,
        organizationId: parseInt(id),
        entityType: 'organizationMember',
        entityId: memberId,
        details: { removedUserId: memberToDelete.userId },
        timestamp: new Date()
      });
      
      return res.status(204).end();
    } catch (error) {
      console.error('Error removing organization member:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Team endpoints
  app.get("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { organizationId } = req.query;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      let teams;
      if (organizationId) {
        // Check if user is member of organization
        const member = await storage.getOrganizationMemberByUserAndOrg(userId, parseInt(organizationId as string));
        if (!member) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        
        teams = await storage.getTeamsByOrganization(parseInt(organizationId as string));
      } else {
        teams = await storage.getTeamsByUser(userId);
      }
      
      return res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { organizationId, name, description } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      if (!organizationId || !name) {
        return res.status(400).json({ message: 'Organization ID and team name are required' });
      }
      
      // Check if user is member of organization
      const orgMember = await storage.getOrganizationMemberByUserAndOrg(userId, organizationId);
      if (!orgMember) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Create team
      const team = await storage.createTeam({
        organizationId,
        name,
        description,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add creator as team admin
      await storage.createTeamMember({
        teamId: team.id,
        userId,
        role: 'admin',
        joinedAt: new Date()
      });
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'team.create',
        userId,
        organizationId,
        entityType: 'team',
        entityId: team.id.toString(),
        details: { name, organizationId },
        timestamp: new Date()
      });
      
      return res.status(201).json(team);
    } catch (error) {
      console.error('Error creating team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const team = await storage.getTeam(parseInt(id));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user is member of team's organization
      const orgMember = await storage.getOrganizationMemberByUserAndOrg(userId, team.organizationId);
      if (!orgMember) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      return res.json(team);
    } catch (error) {
      console.error('Error fetching team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.patch("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      const { name, description } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const team = await storage.getTeam(parseInt(id));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user is admin of team
      const teamMember = await storage.getTeamMemberByUserAndTeam(userId, parseInt(id));
      if (!teamMember || teamMember.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      const updatedTeam = await storage.updateTeam(parseInt(id), {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        updatedAt: new Date()
      });
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'team.update',
        userId,
        organizationId: team.organizationId,
        entityType: 'team',
        entityId: id,
        details: { changes: req.body },
        timestamp: new Date()
      });
      
      return res.json(updatedTeam);
    } catch (error) {
      console.error('Error updating team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.delete("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const team = await storage.getTeam(parseInt(id));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user is org admin or team admin
      const orgMember = await storage.getOrganizationMemberByUserAndOrg(userId, team.organizationId);
      const teamMember = await storage.getTeamMemberByUserAndTeam(userId, parseInt(id));
      
      if (!(orgMember?.role === 'admin' || (teamMember?.role === 'admin'))) {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      // Delete team
      await storage.deleteTeam(parseInt(id));
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'team.delete',
        userId,
        organizationId: team.organizationId,
        entityType: 'team',
        entityId: id,
        details: { name: team.name },
        timestamp: new Date()
      });
      
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting team:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get("/api/teams/:id/members", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const team = await storage.getTeam(parseInt(id));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user is member of team's organization
      const orgMember = await storage.getOrganizationMemberByUserAndOrg(userId, team.organizationId);
      if (!orgMember) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const members = await storage.getTeamMembersByTeam(parseInt(id));
      
      // Get user details for each member
      const memberDetails = await Promise.all(
        members.map(async (m) => {
          const user = await storage.getUser(m.userId);
          return {
            ...m,
            user: user ? {
              id: user.id,
              username: user.username,
              email: user.email,
              profileImageUrl: user.profileImageUrl
            } : null
          };
        })
      );
      
      return res.json(memberDetails);
    } catch (error) {
      console.error('Error fetching team members:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post("/api/teams/:id/members", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      const { memberUserId, role = 'member' } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const team = await storage.getTeam(parseInt(id));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user is team admin
      const teamMember = await storage.getTeamMemberByUserAndTeam(userId, parseInt(id));
      if (!teamMember || teamMember.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      // Check if user to add exists
      const userToAdd = await storage.getUser(memberUserId);
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is member of organization
      const orgMember = await storage.getOrganizationMemberByUserAndOrg(memberUserId, team.organizationId);
      if (!orgMember) {
        return res.status(400).json({ message: 'User must be a member of the organization first' });
      }
      
      // Check if user is already a team member
      const existingMember = await storage.getTeamMemberByUserAndTeam(memberUserId, parseInt(id));
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this team' });
      }
      
      // Add member
      const newMember = await storage.createTeamMember({
        teamId: parseInt(id),
        userId: memberUserId,
        role,
        joinedAt: new Date()
      });
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'team.addMember',
        userId,
        organizationId: team.organizationId,
        entityType: 'teamMember',
        entityId: newMember.id.toString(),
        details: { teamId: id, memberId: memberUserId, role },
        timestamp: new Date()
      });
      
      return res.status(201).json(newMember);
    } catch (error) {
      console.error('Error adding team member:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.patch("/api/teams/:id/members/:memberId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id, memberId } = req.params;
      const { role } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const team = await storage.getTeam(parseInt(id));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user is team admin
      const teamMember = await storage.getTeamMemberByUserAndTeam(userId, parseInt(id));
      if (!teamMember || teamMember.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden - Admin access required' });
      }
      
      // Get member to update
      const memberToUpdate = await storage.getTeamMember(parseInt(memberId));
      if (!memberToUpdate || memberToUpdate.teamId !== parseInt(id)) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Update member
      const updatedMember = await storage.updateTeamMember(parseInt(memberId), {
        role
      });
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'team.updateMember',
        userId,
        organizationId: team.organizationId,
        entityType: 'teamMember',
        entityId: memberId,
        details: { role },
        timestamp: new Date()
      });
      
      return res.json(updatedMember);
    } catch (error) {
      console.error('Error updating team member:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.delete("/api/teams/:id/members/:memberId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id, memberId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const team = await storage.getTeam(parseInt(id));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user is team admin or removing self
      const teamMember = await storage.getTeamMemberByUserAndTeam(userId, parseInt(id));
      const memberToDelete = await storage.getTeamMember(parseInt(memberId));
      
      if (!teamMember || (teamMember.role !== 'admin' && memberToDelete?.userId !== userId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      if (!memberToDelete || memberToDelete.teamId !== parseInt(id)) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Cannot remove the last admin
      if (memberToDelete.role === 'admin') {
        const admins = (await storage.getTeamMembersByTeam(parseInt(id)))
          .filter(m => m.role === 'admin');
        
        if (admins.length <= 1) {
          return res.status(400).json({ message: 'Cannot remove the last admin of a team' });
        }
      }
      
      // Delete member
      await storage.deleteTeamMember(parseInt(memberId));
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'team.removeMember',
        userId,
        organizationId: team.organizationId,
        entityType: 'teamMember',
        entityId: memberId,
        details: { teamId: id, removedUserId: memberToDelete.userId },
        timestamp: new Date()
      });
      
      return res.status(204).end();
    } catch (error) {
      console.error('Error removing team member:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Audit Log endpoints
  app.get("/api/audit-logs", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { organizationId, entityType, entityId, action, limit = 50, offset = 0 } = req.query;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      let orgId: number | undefined;
      
      // If organizationId is provided, verify user is a member of this organization
      if (organizationId) {
        orgId = parseInt(organizationId as string);
        const isMember = await storage.getOrganizationMemberByUserAndOrg(userId, orgId);
        if (!isMember) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      } else {
        // If no organizationId provided, get user's organizations
        const userOrgs = await storage.getOrganizationsByUser(userId);
        // Default to user's personal logs if they don't have any org
        if (userOrgs.length === 0) {
          const logs = await storage.getAuditLogsByUser(
            userId, 
            parseInt(limit as string), 
            parseInt(offset as string),
            entityType as string, 
            entityId as string,
            action as string
          );
          return res.json(logs);
        }
      }
      
      // Get audit logs filtered by org, entity type, entity ID, and action
      const logs = await storage.getAuditLogs(
        orgId,
        parseInt(limit as string),
        parseInt(offset as string),
        entityType as string,
        entityId as string,
        action as string
      );
      
      return res.json(logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get("/api/audit-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const log = await storage.getAuditLog(parseInt(id));
      if (!log) {
        return res.status(404).json({ message: 'Audit log not found' });
      }
      
      // If the log has an organizationId, verify user is a member of this organization
      if (log.organizationId) {
        const isMember = await storage.getOrganizationMemberByUserAndOrg(userId, log.organizationId);
        if (!isMember) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      } 
      // If it's a personal log, verify it belongs to the user
      else if (log.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      return res.json(log);
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Workflow Permission endpoints
  app.get("/api/workflows/:id/permissions", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if workflow exists and user has access to view permissions
      const workflow = await storage.getWorkflow(parseInt(id));
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      // Only workflow owner or org admins can view permissions
      if (workflow.ownerId !== userId) {
        // Check if workflow is part of an organization and user is admin
        if (workflow.organizationId) {
          const orgMember = await storage.getOrganizationMemberByUserAndOrg(userId, workflow.organizationId);
          if (!orgMember || orgMember.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
          }
        } else {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      
      // Get all permissions for this workflow
      const permissions = await storage.getWorkflowPermissionsByWorkflow(parseInt(id));
      
      // Get user/team/organization details for each permission
      const permissionDetails = await Promise.all(
        permissions.map(async (permission) => {
          if (permission.entityType === 'user') {
            const user = await storage.getUser(parseInt(permission.entityId));
            return {
              ...permission,
              entity: user ? {
                id: user.id,
                username: user.username,
                email: user.email,
                profileImageUrl: user.profileImageUrl
              } : null
            };
          } else if (permission.entityType === 'team') {
            const team = await storage.getTeam(parseInt(permission.entityId));
            return {
              ...permission,
              entity: team
            };
          } else if (permission.entityType === 'organization') {
            const org = await storage.getOrganization(parseInt(permission.entityId));
            return {
              ...permission,
              entity: org
            };
          }
          return permission;
        })
      );
      
      return res.json(permissionDetails);
    } catch (error) {
      console.error('Error fetching workflow permissions:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post("/api/workflows/:id/permissions", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id } = req.params;
      const { entityType, entityId, accessLevel } = req.body;
      
      if (!userId || !entityType || !entityId || !accessLevel) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Check if workflow exists and user has access to manage permissions
      const workflow = await storage.getWorkflow(parseInt(id));
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      // Only workflow owner or org admins can add permissions
      if (workflow.ownerId !== userId) {
        // Check if workflow is part of an organization and user is admin
        if (workflow.organizationId) {
          const orgMember = await storage.getOrganizationMemberByUserAndOrg(userId, workflow.organizationId);
          if (!orgMember || orgMember.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
          }
        } else {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      
      // Validate entity exists
      let entityExists = false;
      if (entityType === 'user') {
        const user = await storage.getUser(parseInt(entityId));
        entityExists = !!user;
      } else if (entityType === 'team') {
        const team = await storage.getTeam(parseInt(entityId));
        entityExists = !!team;
        
        // Ensure team is part of the workflow's organization if applicable
        if (entityExists && workflow.organizationId && team.organizationId !== workflow.organizationId) {
          return res.status(400).json({ message: 'Team must belong to the same organization as the workflow' });
        }
      } else if (entityType === 'organization') {
        const org = await storage.getOrganization(parseInt(entityId));
        entityExists = !!org;
        
        // Ensure organization matches the workflow's organization if applicable
        if (entityExists && workflow.organizationId && parseInt(entityId) !== workflow.organizationId) {
          return res.status(400).json({ message: 'Organization must match the workflow\'s organization' });
        }
      }
      
      if (!entityExists) {
        return res.status(404).json({ message: `${entityType} not found` });
      }
      
      // Check if permission already exists
      const existingPermission = await storage.getWorkflowPermissionByEntity(
        parseInt(id),
        entityType,
        entityId
      );
      
      if (existingPermission) {
        // Update existing permission
        const updatedPermission = await storage.updateWorkflowPermission(
          existingPermission.id,
          { accessLevel }
        );
        
        // Log audit entry
        await storage.createAuditLog({
          action: 'workflow.updatePermission',
          userId,
          organizationId: workflow.organizationId,
          entityType: 'workflowPermission',
          entityId: existingPermission.id.toString(),
          details: { workflowId: id, entityType, entityId, accessLevel },
          timestamp: new Date()
        });
        
        return res.json(updatedPermission);
      }
      
      // Create new permission
      const newPermission = await storage.createWorkflowPermission({
        workflowId: parseInt(id),
        entityType,
        entityId,
        accessLevel,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'workflow.addPermission',
        userId,
        organizationId: workflow.organizationId,
        entityType: 'workflowPermission',
        entityId: newPermission.id.toString(),
        details: { workflowId: id, entityType, entityId, accessLevel },
        timestamp: new Date()
      });
      
      return res.status(201).json(newPermission);
    } catch (error) {
      console.error('Error adding workflow permission:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.delete("/api/workflows/:id/permissions/:permissionId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.user as any;
      const { id, permissionId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if workflow exists and user has access to manage permissions
      const workflow = await storage.getWorkflow(parseInt(id));
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      // Only workflow owner or org admins can remove permissions
      if (workflow.ownerId !== userId) {
        // Check if workflow is part of an organization and user is admin
        if (workflow.organizationId) {
          const orgMember = await storage.getOrganizationMemberByUserAndOrg(userId, workflow.organizationId);
          if (!orgMember || orgMember.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
          }
        } else {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      
      // Get permission to remove
      const permission = await storage.getWorkflowPermission(parseInt(permissionId));
      if (!permission || permission.workflowId !== parseInt(id)) {
        return res.status(404).json({ message: 'Permission not found' });
      }
      
      // Remove permission
      await storage.deleteWorkflowPermission(parseInt(permissionId));
      
      // Log audit entry
      await storage.createAuditLog({
        action: 'workflow.removePermission',
        userId,
        organizationId: workflow.organizationId,
        entityType: 'workflowPermission',
        entityId: permissionId,
        details: { 
          workflowId: id, 
          entityType: permission.entityType, 
          entityId: permission.entityId 
        },
        timestamp: new Date()
      });
      
      return res.status(204).end();
    } catch (error) {
      console.error('Error removing workflow permission:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // OIDC Authentication flow
  app.get("/api/oidc/login/:providerId", isAuthenticated, async (req, res) => {
    try {
      const { providerId } = req.params;
      const provider = await storage.getOidcProvider(parseInt(providerId));
      
      if (!provider) {
        return res.status(404).json({ message: "OIDC provider not found" });
      }
      
      // Parse scopes from string to array if needed
      const scopes = typeof provider.scopes === 'string' 
        ? JSON.parse(provider.scopes as string) 
        : (Array.isArray(provider.scopes) ? provider.scopes : ['openid', 'profile', 'email']);
      
      // Prepare provider config
      const providerConfig = {
        ...provider,
        scopes
      };
      
      // Generate auth parameters with PKCE support
      const { state, nonce, codeVerifier, codeChallenge } = OpenIDConnectService.generateAuthParams();
      
      // Store parameters in session
      req.session.oidcState = state;
      req.session.oidcNonce = nonce;
      req.session.oidcProviderId = provider.id;
      req.session.oidcCodeVerifier = codeVerifier;
      
      // Generate authorization URL with PKCE
      const authUrl = await OpenIDConnectService.getAuthorizationUrl(
        providerConfig,
        state,
        nonce,
        codeChallenge
      );
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating OIDC login:", error);
      
      // Enhanced error handling
      if (error.name === 'OidcProviderError' || error.name === 'OidcDiscoveryError') {
        return res.status(error.statusCode || 400).json({ 
          error: error.message, 
          details: error.details 
        });
      }
      
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/oidc/callback", async (req, res) => {
    try {
      // Get parameters from query
      const callbackParams = {
        state: req.query.state,
        code: req.query.code,
        error: req.query.error,
        error_description: req.query.error_description
      };
      
      // Retrieve stored state and other params from session
      const sessionState = req.session.oidcState;
      const sessionNonce = req.session.oidcNonce;
      const providerId = req.session.oidcProviderId;
      const codeVerifier = req.session.oidcCodeVerifier;
      
      if (!sessionState || !sessionNonce || !providerId) {
        return res.status(400).json({ 
          error: "Invalid session", 
          message: "Missing required session parameters for OIDC flow" 
        });
      }
      
      // Check for error in callback
      if (callbackParams.error) {
        return res.status(400).json({ 
          error: "Authentication error", 
          message: callbackParams.error_description || callbackParams.error 
        });
      }
      
      // Get provider config
      const provider = await storage.getOidcProvider(providerId);
      if (!provider) {
        return res.status(404).json({ message: "OIDC provider not found" });
      }
      
      // Parse scopes from string to array if needed
      const scopes = typeof provider.scopes === 'string' 
        ? JSON.parse(provider.scopes as string) 
        : (Array.isArray(provider.scopes) ? provider.scopes : ['openid', 'profile', 'email']);
      
      // Prepare provider config
      const providerConfig = {
        ...provider,
        scopes
      };
      
      // Exchange code for tokens with PKCE
      const tokenSet = await OpenIDConnectService.handleCallback(
        providerConfig,
        callbackParams,
        sessionState as string,
        sessionNonce,
        codeVerifier
      );
      
      // Get user info
      const userInfo = await OpenIDConnectService.getUserInfo(
        providerConfig,
        tokenSet.access_token
      );
      
      // Convert provider config to integration config
      const integrationConfig = OpenIDConnectService.toIntegrationConfig(
        providerConfig,
        tokenSet
      );
      
      // Create or update API integration
      const user = req.user as any;
      
      if (user) {
        // Create or update integration
        const existingIntegrations = await storage.getApiIntegrationsByUser(user.id);
        const existingIntegration = existingIntegrations.find(i => i.name === provider.name);
        
        // Add user info to integration config
        const configWithUserInfo = {
          ...integrationConfig,
          userInfo: JSON.stringify(userInfo)
        };
        
        if (existingIntegration) {
          await storage.updateApiIntegration(existingIntegration.id, {
            ...configWithUserInfo,
            config: JSON.stringify(configWithUserInfo)
          });
        } else {
          await storage.createApiIntegration({
            ...configWithUserInfo,
            userId: user.id,
            config: JSON.stringify(configWithUserInfo)
          });
        }
        
        // Clean up session data after successful processing
        delete req.session.oidcState;
        delete req.session.oidcNonce;
        delete req.session.oidcProviderId;
        delete req.session.oidcCodeVerifier;
        
        // Redirect to integrations page
        res.redirect('/integrations');
      } else {
        // If not authenticated, redirect to login with a message
        res.redirect('/login?message=Please%20log%20in%20to%20complete%20the%20integration');
      }
    } catch (error) {
      console.error("Error handling OIDC callback:", error);
      
      // Enhanced error handling with specific error types
      if (error.name && error.name.startsWith('Oidc')) {
        return res.status(error.statusCode || 400).json({ 
          error: error.message, 
          details: error.details 
        });
      }
      
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Refreshing tokens for OIDC integrations
  app.post("/api/oidc/refresh-token/:integrationId", isAuthenticated, async (req, res) => {
    try {
      const { integrationId } = req.params;
      const user = req.user as any;
      
      // Get the integration
      const integration = await storage.getApiIntegration(parseInt(integrationId));
      
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      
      // Check if user owns the integration
      if (integration.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get integration config
      const config = JSON.parse(integration.config || '{}');
      
      // Check if it's an OIDC integration and has a refresh token
      if (config.providerType !== 'oidc' || !config.refreshToken) {
        return res.status(400).json({ message: "Not a valid OIDC integration or missing refresh token" });
      }
      
      // Get the provider
      const providers = await storage.getAllOidcProviders();
      const provider = providers.find(p => p.name === integration.name);
      
      if (!provider) {
        return res.status(404).json({ message: "OIDC provider not found" });
      }
      
      // Parse scopes
      const scopes = typeof provider.scopes === 'string' 
        ? JSON.parse(provider.scopes as string) 
        : (Array.isArray(provider.scopes) ? provider.scopes : ['openid', 'profile', 'email']);
      
      // Prepare provider config
      const providerConfig = {
        ...provider,
        scopes
      };
      
      // Refresh the token
      const refreshedTokens = await OpenIDConnectService.refreshAccessToken(
        providerConfig,
        config.refreshToken
      );
      
      // Update the integration with new tokens
      const updatedConfig = {
        ...config,
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token || config.refreshToken,
        expiresAt: refreshedTokens.expires_in 
          ? Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
          : undefined,
      };
      
      await storage.updateApiIntegration(integration.id, {
        ...integration,
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token || integration.refreshToken,
        config: JSON.stringify(updatedConfig)
      });
      
      res.json({ message: "Token refreshed successfully" });
    } catch (error) {
      console.error("Error refreshing OIDC token:", error);
      
      if (error.name && error.name.startsWith('Oidc')) {
        return res.status(error.statusCode || 400).json({ 
          error: error.message, 
          details: error.details 
        });
      }
      
      res.status(500).json({ message: "Server error" });
    }
  });

  // Register all routes
  app.use(usageRoutes);
  app.use(subscriptionRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/scraping', scrapingRoutes);
  app.use(agentRoutes);
  app.use(guardrailsRoutes);
  app.use(searchRoutes);
  app.use(activityLogRoutes);
  app.use(userPreferencesRoutes);
  app.use('/api/runtime', runtimeRoutes());
  app.use(executionRoutes);
  app.use('/api/integrations/airbyte', airbyteRoutes);
  app.use('/api/integrations/composio', composioRoutes);
  app.use('/api/integrations/slack', slackRoutes);
  app.use('/api/oauth', oauthRoutes);
  app.use('/api/langflow', langflowRoutes);
  app.use('/api/langchain', langchainRoutes);
  app.use('/api/vector-db', vectorDbRoutes);
  // Register memory and RAG routes
  registerMemoryRoutes(app);
  app.use('/api/rag', ragRoutes);
  app.use('/api/rag', ragImportRoutes);
  // Register telemetry routes
  app.use('/api/telemetry', telemetryRouter);
  app.use('/api/workflows', workflowRoutes);

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time workflow execution updates
  webSocketHandler.initialize(httpServer);
  
  // Setup event listener to forward workflow execution events to WebSockets
  onEvent('execution_update', (data) => {
    if (data && data.executionId) {
      webSocketHandler.sendExecutionEvent(data.executionId, data.event);
    }
  });
  
  console.log('[websocket] WebSocket server initialized for workflow executions');
  

  
  return httpServer;
}
