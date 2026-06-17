# Cobebyte Sol. AI Docs Generator Flow

This document outlines the end-to-end data flow, required input structures, and the final output schema of the AI Docs Generator system.

## 🔄 End-to-End Pipeline Flow

The core generation engine is an automated n8n workflow that triggers on code changes, analyzes the architecture via LLMs, and stores the results in Supabase for the Next.js frontend to consume.

### 1. Trigger Phase (GitHub / Webhooks)
*   **Event:** A push to `main` or a Pull Request merge occurs.
*   **Action:** A GitHub Webhook sends a payload to the n8n pipeline.
*   **Extraction:** The pipeline extracts the `repo` name, `branch`, and the specific `file_path`(s) that changed.

### 2. Analysis Phase
*   **Code Fetching:** The pipeline fetches the raw file contents directly from the GitHub API.
*   **Metadata Extraction:** The raw code is sent to an LLM (Groq / `llama-3.1-8b-instant`) to extract pure structured data: functions, classes, dependencies, inputs, and outputs.
*   **Architecture Analyzer:** A deterministic script analyzes the metadata and code to identify the system type (e.g., E-Commerce, AI/ML, Real-time) and generates a relevant **Mermaid Flowchart**.

### 3. Generation Phase (Create vs. Update)
*   **Lookup:** The pipeline queries Supabase to check if a document already exists for this repository.
*   **Create Mode:** If no document exists, the LLM generates a complete, investor-grade technical document with 7 predefined sections.
*   **Update Mode:** If a document exists, the LLM is given the existing document and the new code. It surgically patches only the sections that genuinely need updating.

### 4. Storage & Rendering Phase
*   **Database:** The final JSON object is upserted into the Supabase `docs` table.
*   **Client App:** The Next.js frontend fetches the JSON from Supabase, normalizes it, and renders it through rich React components (Mermaid diagrams, syntax-highlighted code blocks, interactive pipeline statuses, etc.).

---

## 📥 Input Structure (Trigger Payload)

When triggering the documentation pipeline manually or via a custom webhook, the expected input is a simple JSON object detailing the changed file:

```json
{
  "repo": "Jatiiiiiiiin/aidoc",
  "branch": "main",
  "file_path": "src/lib/RealTimeMetricsPlugin.ts"
}
```

---

## 📤 Output Structure (Supabase Database Schema)

The AI generates and saves a strictly typed JSON object. This is exactly what the Next.js application consumes to render the UI.

```json
{
  "slug": "jatiiiiiiiin-aidoc",
  "title": "Cobebyte AI Docs Generator - Technical Documentation",
  "description": "Investor-grade technical documentation for the Cobebyte AI documentation system.",
  "content": {
    "sections": [
      {
        "id": "executive-summary",
        "type": "text",
        "title": "Executive Summary",
        "content": "A high-level summary of the repository's purpose and functionality."
      },
      {
        "id": "pipeline-flowchart",
        "type": "code",
        "language": "mermaid",
        "title": "Architecture Flowchart",
        "content": "graph TD\\n  A[GitHub Push] --> B[n8n Pipeline]\\n  B --> C[Supabase]"
      },
      {
        "id": "inputs-outputs",
        "type": "table",
        "title": "Inputs and Outputs",
        "content": {
          "headers": ["Type", "Name", "Specification"],
          "rows": [
            ["Input", "Webhook Payload", "JSON containing repo and file paths"]
          ]
        }
      },
      {
        "id": "pipeline-status",
        "type": "pipeline",
        "title": "Interactive Processing Pipeline",
        "content": {
          "nodes": [
            {
              "id": "ingestion",
              "name": "Data Ingestion",
              "status": "success",
              "description": "Ingests raw signals."
            }
          ]
        }
      }
    ],
    "metadata": {
      "technologies": ["Next.js", "TypeScript", "TailwindCSS"],
      "functions": ["getDocVersions", "normalizeDoc"]
    },
    "updated_at": "2026-06-17T12:00:00.000Z"
  }
}
```

### Supported Section Types
The Next.js frontend (`src/components/docs/SectionRenderer.tsx`) is explicitly designed to parse the following `type` attributes inside the `sections` array:
1.  **`text`**: Standard Markdown rendering.
2.  **`bullets`**: Renders an array of strings as a formatted list.
3.  **`code`**: Displays syntax-highlighted code blocks or renders live Mermaid diagrams if `language` is set to `"mermaid"`.
4.  **`table`**: Renders a rich HTML table using `headers` and `rows` arrays.
5.  **`pipeline`**: Renders interactive status nodes (idle, running, success, error) to visualize system states.
