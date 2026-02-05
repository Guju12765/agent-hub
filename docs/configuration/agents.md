# Subagents Configuration

Subagents are specialized AI assistants that Claude can delegate tasks to.

**Location:** `~/.agent-hub/agents/<name>/agents/`

## Default Subagents

The `agents/` directory is empty by default. You can add your own custom subagents as needed.

## Subagent Format

Subagents are markdown files that define specialized behavior:

```markdown
---
name: code-reviewer
description: Review code changes for quality and security
---

# Code Reviewer

## Role

I am a code reviewer specializing in security and quality analysis.

## When Invoked

Use me when reviewing code changes before commit or merge.

## Process

1. Get list of changed files
2. For each file, analyze:
   - Security vulnerabilities
   - Code quality issues
   - Best practice violations
3. Generate report with severity levels
4. Provide fix suggestions

## Output Format

```
REVIEW SUMMARY
==============
Files reviewed: X
Critical issues: X
High issues: X
Medium issues: X

DETAILS
-------
[file:line] [SEVERITY] Description
  Suggestion: How to fix
```

## Rules I Follow

- Never approve code with security vulnerabilities
- Flag hardcoded credentials as CRITICAL
- Require tests for new functionality
```

## How Subagents Work

When Claude needs specialized help:

1. Claude identifies the need for a subagent
2. Reads the subagent definition
3. Adopts the subagent's role and process
4. Executes the task following the defined approach
5. Returns to normal operation

## Invoking Subagents

### Via Commands

Many commands automatically invoke subagents:

| Command | Invokes |
|---------|---------|
| `/plan` | planner.md |
| `/code-review` | code-reviewer.md |
| `/tdd` | tdd-guide.md |
| `/build-fix` | build-error-resolver.md |

### Directly

Reference the agent in conversation:

```
Can you invoke the architect agent to review this system design?
```

## Adding Custom Subagents

Create a new agent file:

```bash
code ~/.agent-hub/agents/alice/agents/my-specialist.md
```

Example custom subagent:

```markdown
---
name: api-designer
description: Design and review API endpoints
---

# API Designer

## Role

I specialize in designing RESTful APIs that are consistent,
well-documented, and follow best practices.

## Process

1. Understand the resource and operations needed
2. Design endpoint structure following REST conventions
3. Define request/response schemas
4. Document with OpenAPI format
5. Review for consistency with existing APIs

## Conventions I Follow

- Use plural nouns for collections (/users, not /user)
- Use HTTP verbs correctly (GET, POST, PUT, DELETE)
- Return appropriate status codes
- Include pagination for lists
- Support filtering and sorting
- Version APIs in URL (/api/v1/)

## Output

Provide:
1. Endpoint definitions
2. Request/response examples
3. OpenAPI specification snippet
```

## Subagent Deployment

When you run `agent-hub hire`:

1. Subagent files copied from master to project
2. Available immediately in `.claude/agents/`

```
Master: ~/.agent-hub/agents/alice/agents/
    ↓
Project: .claude/agents/
```

### Updating Subagents

If you add new subagents to the master and want to deploy them to an existing project:

```bash
# Update with conflict resolution
agent-hub hire alice --update

# Force replace all subagents
agent-hub hire alice --update --force-replace
```

When subagent files conflict, you'll be prompted to keep, replace, merge, or diff each file.

## Best Practices

1. **Single responsibility** - Each agent does one thing well
2. **Clear process** - Define step-by-step workflow
3. **Output format** - Specify expected output structure
4. **Rules and constraints** - What the agent must/must not do
5. **Examples** - Show concrete usage
