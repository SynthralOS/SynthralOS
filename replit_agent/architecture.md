# SynthralOS Architecture

## Overview

SynthralOS is a next-generation AI workflow automation platform built to provide comprehensive automation capabilities through advanced agent frameworks, document processing, API integrations, and workflow orchestration.

The platform follows a modular architecture divided into six distinct development phases:

1. **Workflow Execution Engine** ✅ - Core workflow orchestration
2. **Agent Framework Integration** ✅ - Connection with 20+ agent protocols
3. **Enterprise Features** ✅ - Organization/team management and audit logging
4. **Guardrails System** ✅ - Security components including ArchGW router, prompt validation
5. **Testing Framework** 🔄 - Comprehensive testing infrastructure
6. **Documentation & Deployment** 🔄 - Documentation and deployment options

## System Architecture

SynthralOS employs a modern full-stack JavaScript/TypeScript architecture:

### Core Architecture

- **Frontend**: React with TypeScript using Vite as the build tool
- **Backend**: Node.js with Express.js providing RESTful API services
- **Database**: PostgreSQL with Drizzle ORM for type-safe database interactions
- **Real-time Communication**: WebSocket server for real-time workflow execution updates
- **Component Library**: shadcn/ui with Tailwind CSS for UI components
- **Containerization**: Support for deployment in containerized environments

### Architectural Pattern

The application follows a services-oriented architecture with:

1. **Client-Server Separation**: Clear separation between frontend client code and backend server code
2. **Service Layer Pattern**: Modular services handling specific functionality domains
3. **Event-Driven Architecture**: WebSocket events for real-time updates during workflow execution
4. **Graph-Based Workflow Engine**: Node-based workflow execution using directed graphs

## Key Components

### Frontend Components

- **React Application**: Located in `client/src/` directory
- **UI Component System**: Using shadcn/ui and TailwindCSS for consistent design
- **State Management**: Likely using React Context or a state management library
- **Workflow Builder Interface**: Visual interface for creating and editing workflows

### Backend Services

1. **API Layer**
   - Express.js HTTP server handling RESTful API requests
   - Routes defined in `server/routes.ts`
   - WebSocket server for real-time updates

2. **Service Layer**
   - Modular services in `server/services/` directory
   - Service Registry pattern for dependency management

3. **Core Services**
   - **Workflow Execution Engine**: Handles workflow graph traversal and execution
   - **Agent Framework**: Integrates with multiple agent architectures
   - **Scraping Service**: Multiple scraping engines including BeautifulSoup, Scrapy, etc.
   - **OCR Service**: Document processing with multiple OCR engines
   - **Social Monitoring**: Track changes across social media platforms
   - **Integration Service**: Connect with external APIs and services

4. **LangGraph Integration**
   - Components for integrating with LangGraph
   - Memory management for agent context
   - Router for handling graph traversal

5. **Security & Guardrails**
   - ArchGW router for architecture governance
   - Prompt validation and protection
   - Authentication and authorization system

6. **Telemetry & Monitoring**
   - OpenTelemetry integration
   - Langfuse for LLM observability
   - PostHog for analytics
   - Performance monitoring

### Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM and includes tables for:

- Users and organizations
- Workflows and workflow executions
- Node executions and logs
- Agent configurations
- Scraping jobs and results
- Social media monitoring
- Integration connections
- Vector data storage

### Python Integration

The system includes Python-based components for specialized functionality:

- **Web Scraping**: Python-based scrapers using BeautifulSoup, Scrapy, and JobSpy
- **Data Processing**: Python tools for data extraction and analysis

## Data Flow

1. **Workflow Creation**:
   - Users create workflows through the visual builder interface
   - Workflow definitions are stored in the database

2. **Workflow Execution**:
   - Workflows are executed by the Workflow Execution Engine
   - The engine traverses the workflow graph, executing nodes in sequence
   - Real-time execution updates are sent to clients via WebSockets

3. **Agent Operations**:
   - Agents use tools including web search, web scraping, OCR, etc.
   - Agents record their actions and reasoning in memory systems
   - Agent outputs feed back into the workflow execution

4. **External Integrations**:
   - The system connects to external services via API integrations
   - OAuth2 and other auth methods are supported for secure connections

5. **Monitoring & Analytics**:
   - System activities are logged and monitored
   - Performance metrics are collected and analyzed
   - Usage quotas are tracked and enforced

## External Dependencies

### AI Model Providers
- **OpenAI**: GPT models for agent capabilities
- **Anthropic**: Claude models for agent capabilities

### Data Storage & Retrieval
- **PostgreSQL**: Primary database
- **Vector Database**: For semantic search and RAG applications
- **Pinecone**: Vector database integration

### External Services
- **Social Media APIs**: For social monitoring
- **OAuth Providers**: For authentication
- **Stripe**: For subscription management
- **SignOz/OpenTelemetry**: For observability
- **Langfuse**: For LLM observability
- **PostHog**: For analytics

## Deployment Strategy

The system supports multiple deployment options:

1. **Development Environment**
   - Local development using `npm run dev`
   - Hot module reloading for frontend and server

2. **Production Deployment**
   - Vite build for frontend assets
   - ESBuild for server-side code
   - Environment-specific configuration

3. **Containerization**
   - Support for containerized deployment
   - Configuration via environment variables

4. **Database**
   - PostgreSQL database connection via connection string
   - Migrations managed through Drizzle ORM

5. **Scaling**
   - Horizontal scaling supported via stateless services
   - WebSocket connections for real-time updates

## Security Architecture

1. **Authentication**
   - OAuth 2.0 with multiple providers
   - Password authentication with bcrypt hashing

2. **Authorization**
   - Role-based access control
   - Organization/team-based permissions

3. **Data Protection**
   - Environment variable segregation
   - API key management
   - Prompt validation and sanitization

4. **Enterprise Features**
   - Audit logging
   - Usage tracking and quotas
   - Subscription-based access controls