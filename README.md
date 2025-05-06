# SynthralOS - AI Workflow Automation Platform

SynthralOS is a next-generation AI workflow automation platform providing comprehensive automation capabilities through advanced agent frameworks, OCR processing, API integrations, and more.

## Features

- **Advanced Agent Frameworks**: Supports multiple agent architectures including AgentGPT, AutoGPT, BabyAGI, MetaGPT, CrewAI, and more
- **AI-Powered Document Processing**: Enhanced OCR with document-type-based engine switching
- **Comprehensive Scraping**: Built-in web scraping and data extraction tools
- **OSINT & Social Monitoring**: Track changes across social media and web platforms
- **Agentic Guardrails System**: Enterprise-grade security with validation and prompt protection
- **Visual Workflow Builder**: Intuitive interface for creating and managing automated workflows

## Architecture

SynthralOS follows a modular architecture divided into 6 development phases:

1. **Workflow Execution Engine** ✅ - Core workflow orchestration
2. **Agent Framework Integration** ✅ - Connection with 20+ agent protocols
3. **Enterprise Features** ✅ - Organization/team management and audit logging
4. **Guardrails System** ✅ - Security components including ArchGW router, prompt validation
5. **Testing Framework** 🔄 - Comprehensive testing infrastructure
6. **Documentation & Deployment** 🔄 - Docs and deployment options

## Technologies

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express.js, PostgreSQL
- **AI Integration**: OpenAI, Anthropic Claude APIs
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: OAuth 2.0 with multiple providers

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key (for some components)
- Anthropic API key (for some components)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/synthralosr.git
   cd synthralos
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory with:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/synthralos
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. Start the development server
   ```
   npm run dev
   ```

## Project Structure

- `/client` - Frontend React application
- `/server` - Backend Express API
- `/shared` - Shared types and schemas
- `/server/services` - Core functionality modules
- `/server/routes` - API endpoint definitions

## Recent Updates

- Implemented BackButton component for improved navigation consistency
- Built 20 agent protocols with proper UI display
- Fully implemented Agentic Guardrails system
- Connected guardrails dashboard to backend API endpoints
- Fixed UI rendering and scrolling issues

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for GPT APIs
- Anthropic for Claude APIs
- shadcn/ui for UI components