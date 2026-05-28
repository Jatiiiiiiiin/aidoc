import { Doc } from "./schema";

export const mockDoc: Doc = {
  title: "Wearable Health Insights Pipeline",
  description: "Enterprise-grade real-time streaming pipeline that processes wearable sensor telemetry, validates schemas, runs features, and serves recommendations.",
  sections: [
    {
      "id": "summary",
      "type": "text",
      "title": "Executive Summary",
      "content": "This document outlines the architecture, data schemas, and pipeline structures for the **Cobebyte Sol. AI Docs** health monitoring engine. The system continuously ingests telemetry data from consumer wearables (Apple Watch, Garmin, Whoop), performs validation, generates high-fidelity features, and passes them to LangGraph models for real-time recommendations.\n\n### Core System Specifications\n- Ingest latency: `< 100ms` target\n- Sync rate: Real-time telemetry via `Webhooks` or batch uploads\n- Target metrics: Heart rate, HRV, active energy, sleep cycles\n\n> [!NOTE]\n> Telemetry ingress is restricted to authorized devices. See the [Platform API Reference](/docs/api) to obtain developer access keys and verify headers.\n\n> [!TIP]\n> Click the **Regen** button on the top-right of any component card to simulate live AI workflow executions and check schema validation outputs."
    },
    {
      "id": "pipeline",
      "type": "pipeline",
      "title": "Data Pipeline Stages",
      "content": {
        "nodes": [
          { "id": "webhook", "name": "Telemetry Webhook", "status": "success", "description": "Ingests raw JSON payloads from client mobile apps via HTTPS." },
          { "id": "validate", "name": "Schema Validation", "status": "success", "description": "Validates types and range constraints using Zod schemas." },
          { "id": "features", "name": "Feature Extraction", "status": "running", "description": "Computes rolling HR variability, active energy, and sleep deficit." },
          { "id": "langgraph", "name": "LangGraph Agent", "status": "idle", "description": "Executes clinical decision model to output recommendations." },
          { "id": "db", "name": "PostgreSQL Store", "status": "idle", "description": "Persists structured recommendations and logs audit trail." }
        ]
      }
    },
    {
      "id": "sample-payload",
      "type": "code",
      "title": "Sample Input Payload",
      "content": {
        "language": "json",
        "filename": "activity_summary.json",
        "code": "{\n  \"userId\": \"usr_8829103\",\n  \"timestamp\": \"2026-05-28T01:20:00Z\",\n  \"metrics\": {\n    \"heart_rate\": 72,\n    \"active_calories\": 420,\n    \"sleep_duration_seconds\": 26400,\n    \"hrv_ms\": 54\n  }\n}"
      }
    },
    {
      "id": "data-schema",
      "type": "table",
      "title": "Physiological Schema Reference",
      "content": {
        "headers": ["Field", "Type", "Source", "Description"],
        "rows": [
          ["heart_rate", "integer", "Sensor", "Real-time beats per minute (BPM) value."],
          ["active_calories", "float", "Accelerometer", "Rolling estimated active energy expenditure (kcal)."],
          ["sleep_duration_seconds", "integer", "Sleep Engine", "Total recorded time in deep, light, and REM states."],
          ["hrv_ms", "integer", "ECG Sensor", "Heart rate variability measured in milliseconds."]
        ]
      }
    },
    {
      "id": "takeaways",
      "type": "bullets",
      "title": "Architectural Takeaways",
      "content": [
        "Event-driven architecture with sub-100ms latency for ingestion.",
        "LangGraph decision agent executes asynchronously with state caching to save costs.",
        "Automatic validation ensures no malformed payloads reach the LLM layer."
      ]
    }
  ]
};

// We also support multiple docs to mock the dynamic sidebar routing
export const mockDocsRegistry: Record<string, Doc> = {
  "wearable-health-insights-pipeline": mockDoc,
  "api": {
    title: "Platform API Reference",
    description: "Detailed request/response structure and endpoint listing for the Cobebyte Sol. AI Docs platform API integrations.",
    sections: [
      {
        id: "api-intro",
        type: "text",
        title: "API Overview",
        content: "The Cobebyte Sol. AI Docs Platform API allows automated workflows to submit source code files and receive structured documentation schemas. It relies on standard bearer token authorization.\n\n> [!IMPORTANT]\n> All requests must be over HTTPS. The default base path is `/api/v1`.\n\n### Base Workflow Steps\n1. Generate a bearer token in your developer settings dashboard.\n2. Submit project payload to `/api/v1/projects`.\n3. Track queue status or poll `/api/v1/docs/:id` until output is marked `success`."
      },
      {
        id: "pipeline-execution",
        type: "pipeline",
        title: "API Process Flow",
        content: {
          nodes: [
            { id: "api-call", name: "HTTPS Request", status: "success", description: "Client posts raw files to /api/v1/generate." },
            { id: "auth", name: "Authorization", status: "success", description: "Validates bearer token against workspace settings." },
            { id: "queue", name: "Task Queueing", status: "success", description: "Enqueues execution in BullMQ cluster." }
          ]
        }
      },
      {
        id: "endpoints",
        type: "table",
        title: "Endpoints",
        content: {
          headers: ["Method", "Path", "Auth Required", "Description"],
          rows: [
            ["POST", "/api/v1/projects", "Yes", "Create a new documentation project container."],
            ["POST", "/api/v1/docs/generate", "Yes", "Trigger structured JSON doc generation for code files."],
            ["GET", "/api/v1/docs/:id", "Yes", "Fetch the completed doc JSON structure."]
          ]
        }
      }
    ]
  }
};
