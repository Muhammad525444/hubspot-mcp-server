const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
console.log("Loaded token:", HUBSPOT_TOKEN ? HUBSPOT_TOKEN.slice(0, 10) : "Missing");


// Health check endpoint (for Render)
app.get("/healthz", (req, res) => {
  res.send("OK");
});

// Minimal MCP-like endpoint
app.post("/mcp", async (req, res) => {
  try {
    const { action, object, payload } = req.body;

    // List tickets
    if (action === "list" && object === "tickets") {
      const response = await axios.get(
        "https://api.hubapi.com/crm/v3/objects/tickets",
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.json({ tools: "list-tickets", data: response.data });
    }

    // Create ticket
    if (action === "create" && object === "ticket") {
      const response = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/tickets",
        payload,
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.json({ tools: "create-ticket", data: response.data });
    }

    res.json({ error: "Unsupported action/object" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .json({
        error: "HubSpot API error",
        details: err.response?.data || err.message,
      });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ HubSpot MCP server running on port ${PORT}`);
});
