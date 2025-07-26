#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import sql from "mssql";
import { DefaultAzureCredential, InteractiveBrowserCredential } from "@azure/identity";

// Import all tools
import { UpdateDataTool } from "./tools/UpdateDataTool.js";
import { InsertDataTool } from "./tools/InsertDataTool.js";
import { ReadDataTool } from "./tools/ReadDataTool.js";
import { CreateTableTool } from "./tools/CreateTableTool.js";
import { CreateIndexTool } from "./tools/CreateIndexTool.js";
import { ListTableTool } from "./tools/ListTableTool.js";
import { DropTableTool } from "./tools/DropTableTool.js";
import { DescribeTableTool } from "./tools/DescribeTableTool.js";

// Define configuration schema
export const configSchema = z.object({
  serverName: z.string().describe("MSSQL server name (e.g., my-server.database.windows.net)"),
  databaseName: z.string().describe("Database name"),
  readOnly: z.boolean().default(false).describe("Enable read-only mode (only SELECT operations allowed)"),
  connectionTimeout: z.number().default(30).describe("Connection timeout in seconds"),
  trustServerCertificate: z.boolean().default(false).describe("Trust self-signed server certificates"),
  useInteractiveBrowser: z.boolean().default(true).describe("Use interactive browser for Azure AD authentication")
});

// Globals for connection and token reuse
let globalSqlPool: sql.ConnectionPool | null = null;
let globalAccessToken: string | null = null;
let globalTokenExpiresOn: Date | null = null;

// Function to create SQL config with fresh access token
async function createSqlConfig(config: z.infer<typeof configSchema>): Promise<{ 
  config: sql.config, 
  token: string, 
  expiresOn: Date 
}> {
  const credential = config.useInteractiveBrowser 
    ? new InteractiveBrowserCredential({
        redirectUri: 'http://localhost'
      })
    : new DefaultAzureCredential();
    
  const accessToken = await credential.getToken('https://database.windows.net/.default');

  return {
    config: {
      server: config.serverName,
      database: config.databaseName,
      options: {
        encrypt: true,
        trustServerCertificate: config.trustServerCertificate
      },
      authentication: {
        type: 'azure-active-directory-access-token',
        options: {
          token: accessToken?.token!,
        },
      },
      connectionTimeout: config.connectionTimeout * 1000, // convert seconds to milliseconds
    },
    token: accessToken?.token!,
    expiresOn: accessToken?.expiresOnTimestamp 
      ? new Date(accessToken.expiresOnTimestamp) 
      : new Date(Date.now() + 30 * 60 * 1000)
  };
}

// Ensure SQL connection is established
async function ensureSqlConnection(config: z.infer<typeof configSchema>) {
  // If we have a pool and it's connected, and the token is still valid, reuse it
  if (
    globalSqlPool &&
    globalSqlPool.connected &&
    globalAccessToken &&
    globalTokenExpiresOn &&
    globalTokenExpiresOn > new Date(Date.now() + 2 * 60 * 1000) // 2 min buffer
  ) {
    return;
  }

  // Otherwise, get a new token and reconnect
  const sqlConfig = await createSqlConfig(config);
  globalAccessToken = sqlConfig.token;
  globalTokenExpiresOn = sqlConfig.expiresOn;

  // Close old pool if exists
  if (globalSqlPool && globalSqlPool.connected) {
    await globalSqlPool.close();
  }

  globalSqlPool = await sql.connect(sqlConfig.config);
}

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  // Create a new MCP server
  const server = new McpServer({
    name: "MSSQL Database MCP Server",
    version: "1.0.0",
  });

  // Initialize all tools
  const updateDataTool = new UpdateDataTool();
  const insertDataTool = new InsertDataTool();
  const readDataTool = new ReadDataTool();
  const createTableTool = new CreateTableTool();
  const createIndexTool = new CreateIndexTool();
  const listTableTool = new ListTableTool();
  const dropTableTool = new DropTableTool();
  const describeTableTool = new DescribeTableTool();

  // Determine which tools to register based on read-only mode
  const tools = config.readOnly
    ? [listTableTool, readDataTool, describeTableTool]
    : [insertDataTool, readDataTool, describeTableTool, updateDataTool, 
       createTableTool, createIndexTool, dropTableTool, listTableTool];

  // Register each tool
  tools.forEach(tool => {
    // Convert the tool's input schema to Zod schema
    const zodSchema: any = {};
    if (tool.inputSchema.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, value]: [string, any]) => {
        if (value.type === 'string') {
          zodSchema[key] = z.string().describe(value.description || '');
        } else if (value.type === 'object') {
          zodSchema[key] = z.object({}).describe(value.description || '');
        }
      });
    }

    server.tool(
      tool.name,
      tool.description,
      zodSchema,
      async (args: any) => {
        try {
          // Ensure SQL connection before running any tool
          await ensureSqlConnection(config);
          
          // Run the tool
          const result = await tool.run(args);
          
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text" as const, 
              text: JSON.stringify({
                success: false,
                message: `Error occurred: ${error}`,
                error: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2)
            }],
            isError: true,
          };
        }
      }
    );
  });

  return server.server;
}