// Final MCP server for HubSpot — HTTP Streamable transport
// Works with n8n MCP Client

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import axios from "axios";

// Read your Render env var
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
if (!HUBSPOT_TOKEN) {
  console.error("❌ Missing env var HUBSPOT_ACCESS_TOKEN");
  process.exit(1);
}

// Minimal capabilities; tools are enabled by default
const server = new Server(
  { name: "hubspot-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// MCP tool: list tickets
server.tool("list-tickets", "List HubSpot tickets", async () => {
  const res = await axios.get("https://api.hubapi.com/crm/v3/objects/tickets", {
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  return { content: [{ type: "json", data: res.data }] };
});

// MCP tool: create ticket
server.tool(
  "create-ticket",
  "Create a HubSpot ticket. Input is a JSON object of ticket properties.",
  async ({ input }) => {
    if (!input || typeof input !== "object") {
      throw new Error("Input must be a JSON object of ticket properties.");
    }

    const res = await axios.post(
      "https://api.hubapi.com/crm/v3/objects/tickets",
      input,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    return { content: [{ type: "json", data: res.data }] };
  }
);

// Start Streamable HTTP transport on /mcp
const PORT = process.env.PORT || 3000;
const transport = new StreamableHTTPServerTransport({
  port: PORT,
  path: "/mcp"
});

server.connect(transport).then(() => {
  console.log(`🚀 HubSpot MCP server ready on port ${PORT} at /mcp`);
});
