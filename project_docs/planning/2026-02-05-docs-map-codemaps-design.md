# Docs-Map Codemaps Feature Design

**Date:** 2026-02-05
**Goal:** Add automated codemap generation to docs-map skill, replacing `architecture/` with `codemaps/`

## Summary

Enhance the docs-map skill to automatically scan source files and generate token-lean architecture documentation in `codemaps/` folder. Includes diff detection with 30% threshold requiring user approval.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| When to run | Integrated into init/update | No separate command needed |
| Language support | Generic + JS/TS enhanced | Works for all, extra detail for JS/TS |
| File generation | Dynamic based on detection | Only create relevant codemaps |
| Format | Tree + inline annotations | Token-lean, developer-friendly |
| Diff calculation | Line-based | Simple, predictable |

## Detection Logic

**Always generated:**
- `codemaps/architecture.md` - Overall structure

**Conditionally generated:**

| Codemap | Detection Rules |
|---------|-----------------|
| backend.md | src/server/, src/api/, server/, api/, routes/ exists OR express/fastify/koa/hono in package.json |
| frontend.md | src/components/, src/pages/, components/, pages/ exists OR react/vue/svelte/angular in package.json |
| data.md | src/models/, models/, schemas/, prisma/ exists OR *.prisma, *.sql files |

## Codemap Format

Each codemap follows this token-lean structure:

```markdown
# [Section] Overview
> Last scanned: YYYY-MM-DD HH:mm

## Structure
src/
  |- folder/        # Purpose (N files, N lines)
  |   |- file.ts    # Key exports
  |   |- file.ts    # Key exports

## Entry Points
- path/to/entry.ts  # Description

## Key Dependencies
dep1, dep2, dep3

## Related Codemaps
- [Other](other.md)
```

Target size: 50-100 lines per codemap.

## Diff Calculation & Approval

**Storage in `.claude/docs-map.json`:**
```json
{
  "codemaps": {
    "lastScan": "2026-02-05T14:30:00Z",
    "files": {
      "architecture.md": { "lines": 45, "hash": "abc123" }
    }
  }
}
```

**Approval flow (when diff > 30%):**
```
Codemap changes detected: 47% difference

Changed:
  architecture.md  +15/-8 lines (new modules)
  backend.md       +32/-45 lines (refactored)

[A]pply  [D]iff  [S]kip  [K]eep old
```

Under 30%: Update silently, log to status.

## Integration with Existing Commands

**Category structure change:**
- Remove: `architecture/`
- Add: `codemaps/` (auto-generated)

**Init workflow addition:**
```
... existing steps ...
7. Scan source files, generate codemaps  <-- NEW
... remaining steps ...
```

**Update workflow addition:**
```
1. Scan project_docs/ for changes
2. Re-scan source files, generate codemaps  <-- NEW
3. If diff > 30%, prompt for approval       <-- NEW
4. Rebuild INDEX.md
5. Report status
```

**Status report addition:**
```
Codemaps:
- architecture.md  [FRESH] 45 lines, scanned 2h ago
- backend.md       [STALE] 62 lines, scanned 5d ago
```

## JS/TS Enhanced Scanning

**Generic scanning (all projects):**
- Directory structure with file/line counts
- Entry point detection
- Config file detection

**Enhanced JS/TS scanning:**
- Parse package.json dependencies
- Scan imports/exports in key files
- Extract: exports, internal deps, external deps

**Limits:**
- Max 100 files scanned for imports
- Skip: node_modules, dist, build, .git
- Timeout: 10 seconds per codemap

## Files to Modify

1. `.claude/skills/docs-map/SKILL.md` - Add codemaps workflow
2. `.claude/skills/docs-map/references/templates.md` - Add codemap templates
3. `.claude/skills/docs-map/references/auto-detect.md` - Add detection patterns

## Implementation Notes

- Codemaps are regenerated on each update (not incremental)
- Freshness timestamp helps users know if docs are current
- Hash stored for quick diff detection without full comparison
