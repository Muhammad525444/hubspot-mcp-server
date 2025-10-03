import { Server } from "@modelcontextprotocol/sdk/server";
import { HTTPServerTransport } from "@modelcontextprotocol/sdk/server/http";
import express from "express";
import axios from "axios";

const HUBSPOT_TOKEN = process.env.PRIVATE_APP_ACCESS_TOKEN;
const app = express();

// Create MCP server
const server = new Server({ name: "hubspot-mcp", version: "1.0.0" });

// Define tools
server.tool("list-tickets", "List HubSpot tickets", async () => {
  const res = await axios.get("https://api.hubapi.com/crm/v3/objects/tickets", {
    headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` }
  });
  return { content: [{ type: "json", data: res.data }] };
});

server.tool("create-ticket", "Create a HubSpot ticket", async ({ input }) => {
  const res = await axios.post(
    "https://api.hubapi.com/crm/v3/objects/tickets",
    input,
    { headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } }
  );
  return { content: [{ type: "json", data: res.data }] };
});

// Hook Express into MCP transport
const transport = new HTTPServerTransport({ app, path: "/mcp" });
server.connect(transport);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ HubSpot MCP server running on port ${PORT}`);
});
