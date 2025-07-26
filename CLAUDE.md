# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MSSQL Database MCP (Model Context Protocol) server that allows AI assistants like Claude to interact with Microsoft SQL Server databases through natural language. It's implemented as a Node.js TypeScript application that provides secure database operations through a standardized MCP interface.

**This server is configured to run on Smithery** - a platform for deploying MCP servers. The main entry point exports a default function that accepts configuration via a Zod schema.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build the project (compiles TypeScript to JavaScript)
npm run build

# Watch mode for development (auto-recompiles on changes)
npm run watch

# Start the compiled server (standalone mode)
npm start

# Development with Smithery (requires API key)
npm run dev

# Build for Smithery deployment
npm run smithery:build
```

## Architecture Overview

### Core Components

1. **MCP Server Entry Point** (`src/index.ts`):
   - Implements the MCP server using `@modelcontextprotocol/sdk`
   - Handles tool registration and request routing
   - Manages Azure AD authentication for SQL Server connections
   - Implements connection pooling and token refresh logic
   - Supports read-only mode via `READONLY` environment variable

2. **Tool System** (`src/tools/`):
   - Each database operation is implemented as a separate tool class
   - Tools implement the MCP `Tool` interface with:
     - `name`: Tool identifier
     - `description`: Human-readable description
     - `inputSchema`: JSON schema for validation
     - `run()`: Async execution method
   - Available tools:
     - `ReadDataTool`: Secure SELECT query execution with SQL injection protection
     - `InsertDataTool`: Insert data into tables
     - `UpdateDataTool`: Update existing records
     - `CreateTableTool`: Create new tables
     - `CreateIndexTool`: Create database indexes
     - `DropTableTool`: Drop tables
     - `ListTableTool`: List all tables in database
     - `DescribeTableTool`: Get table schema information

### Key Design Patterns

1. **Security-First Approach**:
   - ReadDataTool implements extensive SQL injection protection with keyword blacklisting and pattern matching
   - All tools validate inputs against defined schemas
   - Connection uses Azure AD authentication instead of SQL passwords
   - Optional read-only mode for production environments

2. **Lazy Connection Management**:
   - SQL connections are established only when needed (not at startup)
   - Connection pooling with automatic token refresh
   - All tools are wrapped with `ensureSqlConnection()` before execution

3. **Environment Configuration**:
   - `SERVER_NAME`: MSSQL server hostname
   - `DATABASE_NAME`: Target database
   - `READONLY`: Set to "true" for read-only operations
   - `CONNECTION_TIMEOUT`: Connection timeout in seconds (default: 30)
   - `TRUST_SERVER_CERTIFICATE`: For self-signed certificates

## TypeScript Configuration

The project uses ES2020 modules with strict TypeScript settings:
- Target: ES2020
- Module: ES2020 
- Strict mode enabled
- Source maps generated
- Declaration files generated

## Adding New Tools

To add a new database operation:

1. Create a new tool class in `src/tools/` implementing the `Tool` interface
2. Define the tool's name, description, and input schema
3. Implement the `run()` method with proper error handling
4. Add the tool instance to `src/index.ts`:
   - Import the tool class
   - Create an instance
   - Add to the tools array in `ListToolsRequestSchema` handler
   - Add a case in the `CallToolRequestSchema` switch statement
   - Include in the `wrapToolRun` array for connection management

## Testing Approach

Currently, there are no automated tests in the codebase. When implementing tests:
- Use the existing `npm test` script if defined
- Test each tool's validation logic separately
- Mock the SQL connection for unit tests
- Consider integration tests with a test database