# Claude-Mem vs Agent-Hub: Feature Comparison

> Analysis of claude-mem's memory system to identify enhancement opportunities for agent-hub.
> Date: 2026-02-08

## Executive Summary

Claude-mem and agent-hub both solve the same core problem: giving Claude Code persistent memory across sessions. However, they take different architectural approaches:

- **Agent-hub**: Three-tier markdown memory (MEMORY.md, daily logs, sessions) with semantic search via MCP tools
- **Claude-mem**: Event-driven observation capture at hook time with SDK agent processing

This document catalogs the gaps and opportunities.

---

## Features Claude-Mem Has That Agent-Hub Lacks

### 1. PostToolUse Hook Capture

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **What** | Captures every tool call (bash, file reads/writes, searches) with exact inputs/outputs | None |
| **When** | Real-time at PostToolUse hook | N/A |
| **Storage** | SQLite `observations` table with timestamps | N/A |

**Impact**: Claude-mem knows exactly what commands were run, what files were read/written, and what searches were performed. Agent-hub relies entirely on the assistant writing notes at PreCompact time.

### 2. SDK Agent for Semantic Compression

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **What** | Claude subprocess analyzes observations, extracts semantic meaning | None |
| **Process** | Event-driven message generator, processes as observations arrive | N/A |
| **Output** | Typed observations with title, facts, concepts, rationale | Raw markdown prose |

**Impact**: Claude-mem uses Claude's reasoning to understand "what happened" and "why it matters" - not just raw data capture.

### 3. Typed Observation System

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **Types** | bug, feature, refactor, decision, doc, investigation, etc. | Unstructured |
| **Schema** | `{ type, title, subtitle, facts[], narrative, concepts[], files_read[], files_modified[] }` | Free-form markdown |
| **Filtering** | Query by type: "show me all decisions" | Text search only |

**Impact**: Structured types enable precise queries like "what architectural decisions were made?" vs. hoping keywords match.

### 4. Token Economics Tracking

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **Metric** | `discovery_tokens` per observation | None |
| **Visibility** | "You captured 5000 observations for 120k tokens, saving ~400k tokens (77%)" | No visibility |
| **Purpose** | Justify memory system cost, optimize capture | N/A |

**Impact**: Users can see the ROI of their memory system and make informed decisions about what to capture.

### 5. Mode-Based Filtering

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **What** | Different observation types per workflow | One-size-fits-all |
| **Examples** | code.json, code--chill.json, email-investigation.json | N/A |
| **Config** | JSON files defining types, concepts, prompts | N/A |

**Impact**: A debugging session captures different things than a feature implementation session.

### 6. Progressive Context Disclosure

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **What** | Shows token estimates before loading | Loads everything or nothing |
| **UI** | "Full: 50k tokens, Summary: 2k, Timeline: 5k" | N/A |
| **Benefit** | Claude can make informed loading decisions | May waste context window |

**Impact**: Prevents accidentally consuming 50k tokens when 2k would suffice.

### 7. Automatic Context Injection

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **When** | SessionStart hook | Never automatic |
| **What** | Relevant observations injected with token budget | Manual `memory_search` calls |
| **Control** | Configurable token limits | N/A |

**Impact**: Claude starts sessions with relevant context already loaded, no manual recall needed.

### 8. Privacy Stripping at Edge

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **What** | `<private>` tags filtered before storage | None |
| **Where** | Hook layer, before data reaches worker | N/A |
| **Guarantee** | Private content never reaches database | N/A |

**Impact**: Users can mark sensitive content that should never be persisted.

---

## Features Both Have, But Claude-Mem Does Better

### 1. Search Strategy

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **Approach** | 4-step: metadata filter → semantic rank → intersect → hydrate | 2-step: 70% vector + 30% FTS5 |
| **Filtering** | Filter by type/date first, then rank | Rank everything, filter after |
| **Performance** | O(filtered set) for vector search | O(all chunks) for vector search |

### 2. Fallback Logic

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **Chain** | Chroma → SQLite → keyword → graceful degrade | Less explicit |
| **Visibility** | Logs which strategy was used | Silent fallback |

### 3. Session Tracking

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **Structure** | session → observations → summary (hierarchical) | Flat markdown files |
| **Granularity** | Individual tool calls tracked | Session-level summaries only |

### 4. Worker Architecture

| Aspect | Claude-Mem | Agent-Hub |
|--------|------------|-----------|
| **Model** | HTTP daemon (localhost:37777) + thin hooks | MCP server spawned per session |
| **Persistence** | Worker survives session restarts | New process each session |
| **Sharing** | Multiple sessions can share worker | Isolated per session |

---

## Features Agent-Hub Has That Claude-Mem Lacks

### 1. Multi-Provider Embeddings

| Aspect | Agent-Hub | Claude-Mem |
|---------|-----------|------------|
| **Providers** | Local (node-llama-cpp), OpenAI, Gemini | Chroma only |
| **Detection** | Auto-detect available provider | Requires Python + Chroma |
| **Fallback** | Graceful degrade to FTS5 | Harder to run without Chroma |

### 2. Three-Tier Memory Model

| Aspect | Agent-Hub | Claude-Mem |
|---------|-----------|------------|
| **Tiers** | MEMORY.md (long) + daily logs (mid) + sessions (short) | Observations + summaries (two-tier) |
| **Curation** | MEMORY.md is human-curated wisdom | All auto-generated |
| **Philosophy** | "Write it down" culture | Automatic capture |

### 3. Agent Identity/Personality

| Aspect | Agent-Hub | Claude-Mem |
|---------|-----------|------------|
| **Template** | CLAUDE.md with consistent persona | No personality layer |
| **Customization** | Rules, skills, hooks, commands | Modes only |

### 4. Skills System

| Aspect | Agent-Hub | Claude-Mem |
|---------|-----------|------------|
| **Extensibility** | Skills with templates, auto-loading | Modes are simpler |
| **Examples** | memory-summarization, docs-map, skill-creator | N/A |

### 5. Cross-Project Agents

| Aspect | Agent-Hub | Claude-Mem |
|---------|-----------|------------|
| **Deployment** | Master agent hired to multiple projects | Per-project only |
| **Sharing** | Same identity across projects | Isolated databases |

---

## Architectural Patterns Worth Adopting

### 1. Handler Pattern (Thin Hooks)
```
src/cli/handlers/
├── post-tool-use.ts    # Validate + delegate to worker
├── session-start.ts    # Validate + delegate to worker
└── stop.ts             # Validate + delegate to worker
```
Hooks are fast, thin, single-responsibility. Business logic lives in worker.

### 2. Strategy Pattern (Pluggable Search)
```typescript
interface SearchStrategy {
  canHandle(options): boolean;
  search(options): Promise<Result>;
}

class SQLiteStrategy implements SearchStrategy { ... }
class ChromaStrategy implements SearchStrategy { ... }
class HybridStrategy implements SearchStrategy { ... }
```
Easy to add new backends without touching orchestrator.

### 3. Event-Driven SDK Agent
```typescript
async function* createMessageGenerator(session) {
  while (true) {
    const message = await sessionQueue.waitForMessage();
    yield message;  // No polling, immediate response
  }
}
```
Zero waste, processes observations as they arrive.

### 4. Edge Privacy Filtering
```typescript
const stripped = stripPrivateTags(prompt);
if (!stripped) return { continue: true, suppressOutput: true };
```
Privacy enforced before data enters the system.

---

## Priority Assessment

### High Impact, Moderate Effort
1. **Typed observation capture** - Adds structure without full SDK agent
2. **Decision detection & logging** - Solves "why did we choose X" problem
3. **Token economics visibility** - Helps users understand memory ROI

### High Impact, High Effort
4. **PostToolUse hook + SDK agent** - Full claude-mem parity
5. **Automatic context injection** - SessionStart with relevant context

### Moderate Impact, Low Effort
6. **Privacy stripping** - Add `<private>` tag support
7. **Progressive disclosure** - Token estimates in search results

### Lower Priority
8. **Mode-based filtering** - Nice-to-have for power users
9. **HTTP worker daemon** - Architectural change with unclear benefit

---

## Open Questions

1. **SDK agent cost**: Claude-mem uses Claude API for compression. Is the token cost worth the semantic understanding?
2. **Hook latency**: PostToolUse hooks add latency to every tool call. What's acceptable?
3. **Observation volume**: With full capture, how many observations per session? Storage implications?
4. **Integration approach**: Extend existing memory system or build parallel observation system?

---

## Next Steps

- [ ] Choose which features to implement first
- [ ] Design detailed implementation plan for selected features
- [ ] Prototype PostToolUse capture without SDK agent (structured logging)
- [ ] Evaluate SDK agent cost/benefit with real usage data
