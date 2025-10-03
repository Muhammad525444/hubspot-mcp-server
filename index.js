// Streamable HTTP MCP server for HubSpot (works with n8n MCP Client)
// Uses the CURRENT TypeScript SDK API: McpServer + registerTool

import express from "express";
import { randomUUID } from "node:crypto";
import axios from "axios";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
if (!HUBSPOT_TOKEN) {
  console.error("❌ Missing env var HUBSPOT_ACCESS_TOKEN");
  process.exit(1);
}

const app = express();
app.use(express.json());

// Keep transports & servers by session
/** @type {Record<string, { transport: StreamableHTTPServerTransport, server: McpServer }>} */
const sessions = {};

// Helper to build a new MCP server for a session and register tools
function buildServer() {
  const server = new McpServer({
    name: "hubspot-mcp",
    version: "1.0.0",
  });

  // list-tickets tool (no input)
  server.registerTool(
    "list-tickets",
    {
      title: "List HubSpot tickets",
      description: "Return HubSpot CRM tickets using the private app token.",
    },
    async () => {
      const res = await axios.get(
        "https://api.hubapi.com/crm/v3/objects/tickets",
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return { content: [{ type: "json", data: res.data }] };
    }
  );

  // create-ticket tool (accepts raw HubSpot payload)
  server.registerTool(
    "create-ticket",
    {
      title: "Create HubSpot ticket",
      description:
        "Create a HubSpot ticket. Pass a JSON object like { \"properties\": { \"subject\": \"...\", \"content\": \"...\", \"hs_pipeline\": \"0\", \"hs_pipeline_stage\": \"1\" } }",
      inputSchema: z.record(z.any()),
    },
    async (input) => {
      const payload = input || {};
      const res = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/tickets",
        payload,
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return { content: [{ type: "json", data: res.data }] };
    }
  );

  return server;
}

// POST /mcp — initialize or reuse session; handle requests
app.post("/mcp", async (req, res) => {
  try {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader)
      ? sessionIdHeader[0]
      : sessionIdHeader;

    if (sessionId && sessions[sessionId]) {
      // Reuse existing session transport for request
      await sessions[sessionId].transport.handleRequest(req, res, req.body);
      return;
    }

    // If no valid session yet, only allow Initialize
    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: no valid session" },
        id: null,
      });
      return;
    }

    // Create a new transport + server for this session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        // Keep for subsequent requests
        sessions[newSessionId] = { transport, server };
      },
    });

    const server = buildServer();
    await server.connect(transport);

    // Handle the very first initialize request on the fresh transport
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("POST /mcp error", err);
    res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Internal Server Error" },
      id: null,
    });
  }
});

// GET /mcp — server-to-client notifications (SSE stream in Streamable HTTP)
app.get("/mcp", async (req, res) => {
  try {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader)
      ? sessionIdHeader[0]
      : sessionIdHeader;

    if (!sessionId || !sessions[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    await sessions[sessionId].transport.handleRequest(req, res);
  } catch (err) {
    console.error("GET /mcp error", err);
    res.status(500).send("Internal Server Error");
  }
});

// DELETE /mcp — terminate session
app.delete("/mcp", async (req, res) => {
  try {
    const sessionIdHeader = req.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader)
      ? sessionIdHeader[0]
      : sessionIdHeader;

    if (sessionId && sessions[sessionId]) {
      sessions[sessionId].transport.close();
      delete sessions[sessionId];
    }
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /mcp error", err);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HubSpot MCP server ready on port ${PORT} at /mcp`);
});

