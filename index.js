import { Server } from "@modelcontextprotocol/sdk/server";
import { HTTPServerTransport } from "@modelcontextprotocol/sdk/server/http";
import axios from "axios";

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

if (!HUBSPOT_TOKEN) {
  console.error("❌ Missing env var HUBSPOT_ACCESS_TOKEN");
  process.exit(1);
}

const server = new Server({ name: "hubspot-mcp", version: "1.0.0" });

server.tool("list-tickets", "List HubSpot tickets", async () => {
  const res = await axios.get("https://api.hubapi.com/crm/v3/objects/tickets", {
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json"
    }
  });
  return { content: [{ type: "json", data: res.data }] };
});

server.tool("create-ticket", "Create a HubSpot ticket", async ({ input }) => {
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
});

// Start an MCP server over HTTP stream on "/"
const PORT = process.env.PORT || 3000;
const transport = new HTTPServerTransport({ port: PORT });

server.connect(transport).then(() => {
  console.log(`🚀 HubSpot MCP server running (HTTP Streamable) on port ${PORT}`);
});
