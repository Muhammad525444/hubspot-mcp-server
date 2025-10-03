import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// Health check endpoint (for Render)
app.get("/healthz", (req, res) => {
  res.send("OK");
});

// Example MCP-like endpoint
app.post("/mcp", async (req, res) => {
  try {
    const { action, object, payload } = req.body;

    // Example: list tickets
    if (action === "list" && object === "tickets") {
      const response = await axios.get(
        "https://api.hubspot.com/crm/v3/objects/tickets",
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.json({ tools: "list-tickets", data: response.data });
    }

    // Example: create a ticket
    if (action === "create" && object === "ticket") {
      const response = await axios.post(
        "https://api.hubspot.com/crm/v3/objects/tickets",
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
    res.status(500).json({ error: "HubSpot API error", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ HubSpot MCP server running on port ${PORT}`);
});
