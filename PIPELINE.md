# AI Docs Pipeline

End-to-end reference for how code changes flow through GitHub Actions into n8n and land as structured documentation in Supabase, rendered by the Next.js viewer.

---

## Overview

```
Git push / PR merge
        │
        ▼
GitHub Actions (ai-docs.yml)
        │
   ┌────┴────────────────────────────────┐
   │ 1. detectChanges.ts                 │
   │    → changed-files.json             │
   │                                     │
   │ 2. prepareWebhookPayload.ts         │
   │    → n8n-payload.json               │
   │                                     │
   │ 3. routeDocs.ts                     │
   │    → docs-mapping.json              │
   │                                     │
   │ 4. curl POST → n8n webhook          │
   └─────────────────────────────────────┘
        │
        ▼
   n8n workflow
        │
   ┌────┴────────────────────────────────┐
   │ Receives payload                    │
   │ Reads changed source files via API  │
   │ Calls Claude / LLM                  │
   │ Generates structured JSON doc       │
   │ Upserts row into Supabase `docs`    │
   └─────────────────────────────────────┘
        │
        ▼
   Next.js viewer (aidoc app)
   /docs/[slug] fetches from Supabase
   and renders the doc
```

---

## GitHub Actions Workflow

**File:** `.github/workflows/ai-docs.yml`

**Triggers:**
- Direct push to `main`
- Pull request merged into `main` (`pull_request` type `closed` + `merged == true` check)

**Runs on:** `ubuntu-latest`, Node 20

### Steps

| Step | Script | Input | Output |
|------|--------|-------|--------|
| Detect Changed Files | `scripts/detectChanges.ts` | git diff | `changed-files.json` |
| Prepare Webhook Payload | `scripts/prepareWebhookPayload.ts` | `changed-files.json` | `n8n-payload.json` |
| Route Files to Doc Mappings | `scripts/routeDocs.ts` | `changed-files.json` | `docs-mapping.json` |
| Send Webhook | `curl POST` | `n8n-payload.json` | n8n triggered |

The webhook step is skipped entirely if `changed-files.json` has zero entries or if the `N8N_DOCS_WEBHOOK_URL` secret is not set.

**Required secret:** `N8N_DOCS_WEBHOOK_URL` — the n8n webhook URL, set in GitHub repo Settings → Secrets.

---

## Scripts

### `scripts/detectChanges.ts`

Runs `git diff --name-only` between the last two commits (or `--base`/`--head` args) and filters the result down to only the source files that matter.

**Args:**
```
--base <sha>     base commit (optional, defaults to HEAD~1)
--head <sha>     head commit (optional, defaults to HEAD)
--output <path>  write filtered list as JSON array (optional)
```

**Filtering rules:**

- Only keeps `.ts`, `.tsx`, `.js`, `.jsx` files
- Drops `node_modules/`, `.github/`, `.next/`, `dist/`, `docs-config/`, `public/`, `.git/`
- Drops specific config files: `next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`, etc.

**Priority ordering** — these directories are sorted to the front of the output so n8n processes the most architecturally important files first:
1. `src/app/api/`
2. `src/services/`
3. `src/lib/`
4. `scripts/`

**Output (`changed-files.json`):**
```json
[
  "src/lib/schema.ts",
  "src/components/docs/DocViewerClient.tsx"
]
```

---

### `scripts/prepareWebhookPayload.ts`

Reads `changed-files.json` and wraps it in a payload with GitHub context pulled from environment variables.

**Args:**
```
--input  <path>   path to changed-files.json (default: changed-files.json)
--output <path>   write payload JSON (default: n8n-payload.json)
```

**Output (`n8n-payload.json`):**
```json
{
  "repo": "owner/repo",
  "branch": "main",
  "commit_sha": "abc123",
  "pr_number": 42,
  "changed_files": [
    "src/lib/schema.ts",
    "src/components/docs/DocViewerClient.tsx"
  ]
}
```

`pr_number` and `commit_sha` are parsed from `GITHUB_EVENT_PATH` when available (merged PR event), otherwise fall back to `GITHUB_SHA` and `null`.

---

### `scripts/routeDocs.ts`

Maps each changed source file to a documentation destination path using the rules in `docs-config/routing.yaml`.

**Args:**
```
--input  <path>   path to changed-files.json
--output <path>   write mappings JSON (default: docs-mapping.json)
--config <path>   routing config (default: docs-config/routing.yaml)
```

**Output (`docs-mapping.json`):**
```json
{
  "src/components/docs/DocViewerClient.tsx": "content/docs/components/DocViewerClient.mdx",
  "src/lib/schema.ts": "content/docs/utils/schema.mdx"
}
```

Files that match no routing rule are logged and skipped — they are still included in the n8n payload, just not mapped to a doc destination.

---

### `scripts/validateWebhookResponse.ts`

Utility for validating and asserting the JSON response returned by n8n after a webhook call. Not used in the workflow directly — can be called manually or integrated into a future response-check step.

**Exports:**
- `validateWebhookResponse(raw)` — parses raw response, returns `{ status, slug, sectionsUpdated, error }`
- `assertWebhookSuccess(response, attempt, max)` — exits with code 1 on final failed attempt

**Response shapes recognized:**
```json
{ "status": "success", "slug": "my-doc", "sectionsUpdated": 3 }
{ "skip": true, "slug": "my-doc" }
{ "error": "something went wrong" }
```

---

### `scripts/findExistingDocs.ts`

Takes the `docs-mapping.json` and categorizes each entry into `toCreate` (doc file doesn't exist yet) vs `toUpdate` (doc file already exists on disk). Not used in the current workflow — available for future local doc file management.

**Args:**
```
--input  <path>   path to docs-mapping.json
--output <path>   write categorized result JSON
```

**Output:**
```json
{
  "toCreate": { "src/lib/schema.ts": "content/docs/utils/schema.mdx" },
  "toUpdate": { "src/components/docs/DocViewerClient.tsx": "content/docs/components/DocViewerClient.mdx" }
}
```

---

### `scripts/updateSections.ts`

Finds and replaces a named section inside any file that uses `<!-- AUTO-MARKER-START -->` / `<!-- AUTO-MARKER-END -->` HTML comment markers. Not used in the current workflow — available for injecting AI-generated content back into existing markdown files.

**Args:**
```
--file         <path>    target file to update
--marker       <name>    section marker name (without the AUTO- prefix)
--content      <string>  new content inline
--content-file <path>    read new content from a file instead
--dry-run                preview without writing
```

**Example marker in a file:**
```html
<!-- AUTO-OVERVIEW-START -->
...old content replaced here...
<!-- AUTO-OVERVIEW-END -->
```

---

## Routing Config

**File:** `docs-config/routing.yaml`

Defines which source glob patterns map to which documentation output paths. Used by `routeDocs.ts`.

```yaml
routes:
  - pattern: "src/components/**/*.tsx"
    dest: "content/docs/components/{name}.mdx"

  - pattern: "src/hooks/**/*.ts"
    dest: "content/docs/hooks/{name}.mdx"

  - pattern: "src/app/api/**/*.ts"
    dest: "content/docs/api/{name}.mdx"

  - pattern: "src/services/**/*.ts"
    dest: "content/docs/services/{name}.mdx"

  - pattern: "src/utils/**/*.ts"
    dest: "content/docs/utils/{name}.mdx"

  - pattern: "src/lib/**/*.ts"
    dest: "content/docs/utils/{name}.mdx"
```

**Template variables available in `dest`:**
- `{name}` — filename without extension (e.g. `DocViewerClient`)
- `{name_slug}` — lowercase kebab-case version
- `{path}` — directory of the source file

Rules are matched top-to-bottom; the first match wins.

---

## n8n Integration

The workflow sends a POST to the n8n webhook URL stored in `N8N_DOCS_WEBHOOK_URL`. n8n receives the payload and is responsible for:

1. **Fetching source file content** — using `repo`, `commit_sha`, and `changed_files` from the payload to pull raw file content from the GitHub API
2. **Generating the doc** — calling an LLM (Claude) with the source code to produce a structured JSON doc matching the schema below
3. **Upserting into Supabase** — inserting or updating a row in the `docs` table

### Webhook Payload Sent to n8n

```json
{
  "repo": "owner/repo-name",
  "branch": "main",
  "commit_sha": "abc123def456",
  "pr_number": 42,
  "changed_files": [
    "src/lib/schema.ts",
    "src/components/docs/DocViewerClient.tsx"
  ]
}
```

### Supabase `docs` Table Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `slug` | text | URL-safe identifier, e.g. `schema` |
| `title` | text | Document title |
| `description` | text | Short summary |
| `content` | jsonb | Full structured doc JSON (see below) |
| `repo` | text | GitHub repo, e.g. `owner/repo` |
| `file_path` | text | Source file path |
| `created_at` | timestamptz | Row creation time — used for versioning |

Multiple rows with the same `slug` are treated as versions of the same document, ordered by `created_at` ascending (v1, v2, v3...).

### Structured Doc JSON Schema

This is the shape n8n must write into the `content` column. Validated by `src/lib/schema.ts` (Zod).

```json
{
  "title": "string",
  "description": "string (optional)",
  "version": "string (optional, e.g. v2)",
  "sections": [
    {
      "id": "string (unique, kebab-case)",
      "type": "text | code | pipeline | table | bullets",
      "title": "string",
      "content": "<see per-type shape below>"
    }
  ]
}
```

**Section content by type:**

`text` — plain string, supports markdown
```json
{ "type": "text", "content": "Markdown string here..." }
```

`code` — code block with language and optional filename
```json
{
  "type": "code",
  "content": { "code": "...", "language": "typescript", "filename": "schema.ts" }
}
```

`pipeline` — flow diagram with nodes and edges
```json
{
  "type": "pipeline",
  "content": {
    "nodes": [
      { "id": "step1", "name": "Ingest", "status": "success", "description": "..." }
    ],
    "edges": [{ "from": "step1", "to": "step2" }]
  }
}
```

Node `status` values: `idle | running | success | error`

`table` — tabular data
```json
{
  "type": "table",
  "content": {
    "headers": ["Field", "Type", "Description"],
    "rows": [["name", "string", "User's full name"]]
  }
}
```

`bullets` — simple bullet list
```json
{ "type": "bullets", "content": ["Point one", "Point two"] }
```

---

## Viewer App

The viewer is a Next.js app (App Router) that reads docs from Supabase and renders them.

### Entry point

**`src/app/page.tsx`** — server component. Queries Supabase for the first doc (ordered by `created_at`) and redirects to `/docs/{slug}`. Falls back to `/docs/wearable-health-insights-pipeline` if the query fails.

### Doc page

**`src/app/docs/[slug]/page.tsx`** — server component. Fetches all Supabase rows, groups them by slug, assigns version labels (`v1`, `v2`, ..., or a custom `version` field from the content JSON), normalizes each via `src/lib/normalizer.ts`, and passes the version list to `DocViewerClient`. Accepts a `?v=` query param to pre-select a version. Falls back to `mockDocsRegistry` if no Supabase row matches.

### Layout / sidebar

**`src/app/docs/layout.tsx`** — client component. Renders the top nav bar (logo, search, theme toggle, AI Layer status badge) and the left sidebar (doc list, section sub-nav, system status panel). Fetches the full doc list from Supabase on mount; falls back to `mockDocsRegistry`. Groups rows by slug into versioned entries. Search covers doc titles and section titles across all docs.

Theme preference is persisted to `localStorage` and applied via a `dark` class on `<html>`.

### Doc viewer

**`src/components/docs/DocViewerClient.tsx`** — client component. Renders the active doc version with:
- Horizontal version toggle pill (only shown when `versions.length > 1`). Switching versions pushes `?v=` to the URL via `router.push`.
- Per-section **Copy** and **Regen** controls. Regen simulates a 2-second async re-generation and updates the section content in local state (does not write back to Supabase).
- **Download .docx** — serialises the active doc to a Word document using the `docx` library and triggers a browser download via `file-saver`.
- Scroll-spy that highlights the active section in the right-side table-of-contents and broadcasts `active-section-change` / `active-doc-version-change` custom events so the sidebar stays in sync.
- `RealTimeMetricsPlugin` — tracks page load engagement events (batched, no actual network call in dev).

### Normalizer

**`src/lib/normalizer.ts`** — repairs non-standard content shapes written by older n8n versions before passing to Zod validation:
1. Lifts `metadata.sections` to top-level `sections` if the top-level array is missing.
2. Auto-constructs sections from legacy `metadata` / `architecture` fields (overview, patterns, mermaid diagram, investor highlights, technical advantages, future scope).
3. Sanitises `type` values to the allowed Zod enum (`text | code | pipeline | table | bullets`) by inspecting the `content` shape.
4. Generates a stable `id` from the section `title` if none is present.

Returns `null` if Zod validation still fails after all repairs.

### Schema

**`src/lib/schema.ts`** — Zod schemas and TypeScript types for the structured doc format. Key exports: `DocSchema`, `SectionSchema`, `Doc`, `Section`, `CodeContent`, `PipelineContent`, `TableContent`.

### Supabase client

**`src/lib/supabase.ts`** — thin wrapper around `@supabase/supabase-js`. Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the environment. Logs a warning (does not throw) if either is missing so the mock fallback still works in local dev without credentials.

### Mock fallback

**`src/lib/mockDoc.ts`** — exports `mockDocsRegistry`, a `Record<string, Doc>` used as a fallback when Supabase is unavailable or returns no data.

### Section renderers

Components under `src/components/docs/` render individual section types:

| File | Renders |
|------|---------|
| `SectionRenderer.tsx` | Dispatcher — picks the right component by `section.type` |
| `TextSection.tsx` | `type: "text"` — markdown via `src/lib/markdown.tsx` |
| `CodeSection.tsx` | `type: "code"` — syntax-highlighted code block |
| `PipelineSection.tsx` | `type: "pipeline"` — node/edge flow diagram |
| `TableSection.tsx` | `type: "table"` — responsive table |
| `BulletsSection.tsx` | `type: "bullets"` — bulleted list |
| `MermaidRenderer.tsx` | Mermaid diagram renderer (used by `CodeSection` for `language: "mermaid"`) |

### Analytics plugin

**`src/lib/RealTimeMetricsPlugin.ts`** — batched event tracker instantiated on doc load. All network calls (WebSocket, Redis, webhook, data warehouse) are stubbed with `console.log`; no external traffic is sent in the current build. Public API: `trackSectionRead`, `trackScrollDepth`, `trackBounceRate`, `calculateCoverageScore`, `trackPerformanceLatency`, `aggregateAttentionHeatmap`, `exportSessionReplay`, `exportToDataWarehouse`. Includes a circuit-breaker (CLOSED → OPEN → HALF_OPEN) for WebSocket failure handling.

---

## Local Dev

```bash
npm run dev        # start Next.js on localhost:3000
npx tsx scripts/detectChanges.ts --output changed-files.json
npx tsx scripts/prepareWebhookPayload.ts --input changed-files.json --output n8n-payload.json
npx tsx scripts/routeDocs.ts --input changed-files.json --output docs-mapping.json
```

Environment variables needed in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

GitHub secret needed for CI:
```
N8N_DOCS_WEBHOOK_URL=https://your-n8n-instance.com/webhook/xxx
```
