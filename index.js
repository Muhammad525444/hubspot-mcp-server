// MCP HubSpot server (HTTP Streamable) for n8n MCP Client
// Tools: list-tickets, create-ticket

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import axios from "axios";

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
if (!HUBSPOT_TOKEN) {
  console.error("❌ Missing env var HUBSPOT_ACCESS_TOKEN");
  process.exit(1);
}

// Create MCP server; enable tools capability
const server = new Server(
  { name: "hubspot-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// --- Tool: list-tickets (no input) ---
server.registerTool(
  "list-tickets",
  {
    title: "List HubSpot tickets",
    description: "Return HubSpot CRM tickets using the private app token."
  },
  async () => {
    const res = await axios.get("https://api.hubapi.com/crm/v3/objects/tickets", {
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    return { content: [{ type: "json", data: res.data }] };
  }
);

// --- Tool: create-ticket (accepts arbitrary HubSpot properties) ---
server.registerTool(
  "create-ticket",
  {
    title: "Create HubSpot ticket",
    description:
      "Create a HubSpot ticket. Pass a JSON object of ticket properties (e.g. { properties: { subject: '...', content: '...' } }).",
    // Accept any JSON object so you can pass HubSpot payloads directly
    inputSchema: z.record(z.any())
  },
  async (input) => {
    const payload = input; // already validated by zod
    const res = await axios.post(
      "https://api.hubapi.com/crm/v3/objects/tickets",
      payload,
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

// Start Streamable HTTP transport at /mcp (what n8n expects)
const PORT = process.env.PORT || 3000;
const transport = new StreamableHTTPServerTransport({ port: PORT, path: "/mcp" });

server.connect(transport).then(() => {
  console.log(`🚀 HubSpot MCP server ready on port ${PORT} at /mcp`);
});
