# README and Docs Sync Design

**Date:** 2026-02-05
**Goal:** Sync README.md with VitePress docs/ content and update project_docs/ to reference docs/

## Changes

### 1. README.md - Memory Path Corrections

Fix incorrect memory paths:

**Before:**
```markdown
- **Long-term**: Consolidated wisdom (`MEMORY.md`)
```

**After:**
```markdown
- **Long-term**: Consolidated wisdom (`.claude/memory/MEMORY.md`)
```

Also fix Architecture diagram to show memory folder structure.

### 2. README.md - Conflict Resolution Section

Add brief section after CLI Commands:

```markdown
### Conflict Resolution

When re-hiring an agent with `--update`, you'll be prompted to handle file conflicts:

- **Keep** - Keep your existing file
- **Replace** - Use the agent's version
- **Merge** - Open both in editor with conflict markers
- **Diff** - Preview differences first

Use `--force-keep` or `--force-replace` to skip prompts. Use `--dry-run` to preview changes.

See [Hire Command](/docs/cli/hire) for full documentation.
```

### 3. project_docs/CONTEXT.md - Documentation Line

Add:
```markdown
## Documentation
- User docs: `docs/` (VitePress) - 45+ pages
- Dev docs: `project_docs/` (Three-Layer Pyramid)
```

### 4. project_docs/DOCS-MAP.md - Structured VitePress Table

Replace current VitePress section with structured breakdown:

```markdown
## VitePress Documentation (docs/)

User-facing documentation built with VitePress:

| Section | Files | Topics |
|---------|-------|--------|
| Getting Started | 3 | Installation, first agent, hire/fire |
| Concepts | 4 | Architecture, memory, targets, continuous learning |
| Configuration | 7 | Identity, agents, skills, rules, hooks, MCP, plugins |
| CLI | 1 | hire command |
| Commands | 1 | Built-in commands |
```

## Files to Modify

1. `README.md` - Memory paths, architecture diagram, conflict resolution section
2. `project_docs/CONTEXT.md` - Add documentation line
3. `project_docs/DOCS-MAP.md` - Enhance VitePress section
