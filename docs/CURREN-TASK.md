# Database Integration

## What the CTO means

When the CTO says "enable the db integration so users can talk to their db", he means:

> A user opens WhatsApp, Slack, or the web dashboard, types a plain-English question like *"Show me all orders from last week above $500"*, and the AI agent translates that into SQL, runs it against the company database, and replies with the results — without the user ever writing SQL.

---

## What is already built

Quite a lot of this already exists. The confusion is that the pieces exist in isolation but are not connected to the agent.

### Dashboard UI (`apps/web/`)

- `/integrations` page — full CRUD for database connections (add, edit, delete, test connection before saving)
- Supported databases selectable from a picker (PostgreSQL and MySQL are enabled; others show "Coming Soon")
- Credentials are encrypted (AES-256-GCM) before being stored in the `integrations` table
- A "workflow" status indicator with polling — currently it marks the workflow as completed immediately (see gap below)

### API routes (`apps/web/src/app/api/integrations/`)

| Route | Purpose |
|---|---|
| `GET/POST/PUT/DELETE /api/integrations` | CRUD for integrations |
| `POST /api/integrations/test-connection` | Live connection test before saving |
| `POST /api/integrations/[id]/query` | Execute a read-only SQL query against a saved integration |
| `GET/POST /api/integrations/[id]/workflow` | Check or trigger the setup workflow |
| `DELETE /api/integrations/[id]/embeddings` | Clear stored knowledge context for an integration |

### Query execution (`apps/web/src/lib/db-connectors.ts`)

- Read-only enforcement (keyword blocklist + database-level `BEGIN TRANSACTION READ ONLY`)
- Automatic `LIMIT` injection if missing
- 30-second query timeout
- PostgreSQL and MySQL supported

### Database schema

- `integrations` table — stores connection configs with encrypted credentials
- `knowledgesources` / `knowledgechunks` tables — for embedding-based schema context

---

## What is NOT yet done (the gap)

The dashboard can store a connection and the API can run a query — but **the agent does not know any of this exists**. When a user sends a message, the agent has no tool to reach the database.

### 1. Agent tool: `query_database`

The agent needs a registered tool it can call. This tool should:
- Accept an integration ID (or name) and a SQL query string
- Look up the integration from the database
- Decrypt the credentials
- Call the existing `executequery()` function from `db-connectors.ts`
- Return rows as structured data the agent can format into a reply

This tool registration goes in `packages/agents/src/pi/tools.ts` alongside the existing bash/read/write tools.

### 2. Agent tool: `list_database_schemas`

Before the agent can write a correct query, it needs to know what tables and columns exist. A second tool should:
- Accept an integration ID
- Query the database's information schema (e.g. `information_schema.tables`, `information_schema.columns`)
- Return a structured schema description

Without this, the agent is writing SQL blind and will hallucinate column names.

### 3. Injecting available integrations into the agent's context

When a session starts, the orchestrator or gateway needs to tell the agent which integrations are available. This could be:
- A system prompt addition listing integration names and their DB types
- Or the agent calling a `list_integrations` tool to discover them

### 4. The workflow endpoint is a stub

`POST /api/integrations/[id]/workflow` currently marks itself as completed immediately with a `TODO` comment. The intended behaviour was to run a setup workflow (schema indexing, embedding generation). This needs to either be implemented or the stub removed so it doesn't mislead.

---

## The gap in one sentence

**The web app can store and query databases, but the AI agent has no tool that calls those APIs.** Add the `query_database` and `list_database_schemas` tools to the agent, wire them up so the agent knows which integrations exist, and the feature works end-to-end.

---

## Files to touch

| File | Change needed |
|---|---|
| `packages/agents/src/pi/tools.ts` | Add `query_database` and `list_database_schemas` tool definitions |
| `packages/gateway/src/` | Pass available integrations into the agent session context |
| `apps/web/src/app/api/integrations/[id]/workflow/route.ts` | Implement or remove the stub workflow |

---

## Related files (already implemented, no changes needed)

- `apps/web/src/app/(application)/integrations/page.tsx` — full UI
- `apps/web/src/app/api/integrations/route.ts` — CRUD API
- `apps/web/src/app/api/integrations/query/route.ts` — query execution API
- `apps/web/src/lib/db-connectors.ts` — PostgreSQL + MySQL connectors with read-only enforcement
- `packages/db/migrations/sqls/20260302040141-create-integrations-up.sql` — DB schema