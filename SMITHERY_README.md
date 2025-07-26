# MSSQL MCP Server on Smithery

This MSSQL MCP server has been configured to run on the Smithery platform, providing seamless integration with AI assistants like Claude.

## Deployment to Smithery

1. **Create a GitHub Repository**
   - Push this code to a new GitHub repository
   - Make sure all files are committed

2. **Deploy on Smithery**
   - Go to [Smithery](https://smithery.ai)
   - Click "Deploy" on the home page
   - Connect your GitHub repository
   - Smithery will automatically build and deploy your server

## Configuration

When connecting to this server, you'll need to provide the following configuration:

- **serverName**: Your MSSQL server hostname (e.g., `my-server.database.windows.net`)
- **databaseName**: The database to connect to
- **readOnly**: Set to `true` for read-only access (default: `false`)
- **connectionTimeout**: Connection timeout in seconds (default: `30`)
- **trustServerCertificate**: Trust self-signed certificates (default: `false`)
- **useInteractiveBrowser**: Use browser for Azure AD auth (default: `true`)

## Development

For local development with Smithery:

```bash
# Install dependencies
npm install

# Start development server (requires Smithery API key)
npm run dev
```

This will start a local server with ngrok tunneling for testing in the Smithery Playground.

## Build Configuration

The `smithery.config.js` file marks Azure Identity and MSSQL packages as external to avoid bundling issues. This is necessary because these packages have native dependencies.

## Available Tools

Based on the `readOnly` configuration:

**Read-Only Mode:**
- `list_tables`: List all tables in the database
- `read_data`: Execute SELECT queries
- `describe_table`: Get table schema information

**Full Access Mode (readOnly: false):**
- All read-only tools plus:
- `insert_data`: Insert new records
- `update_data`: Update existing records
- `create_table`: Create new tables
- `create_index`: Create database indexes
- `drop_table`: Drop tables

## Security

- Uses Azure AD authentication (no passwords in config)
- SQL injection protection on all queries
- Optional read-only mode for production safety
- Automatic token refresh for long-running sessions