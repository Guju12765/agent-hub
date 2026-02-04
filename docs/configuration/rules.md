# Rules Configuration

Rules are coding guidelines that Claude follows during development.

**Location:** `~/.agent-hub/agents/<name>/rules/`

## Default Rules

Every agent comes with eight built-in rules:

| Rule | Purpose |
|------|---------|
| `security.md` | Security best practices, vulnerability prevention |
| `testing.md` | Testing guidelines, coverage requirements |
| `performance.md` | Performance considerations, optimization patterns |
| `git-workflow.md` | Git commit and branch conventions |
| `coding-style.md` | Code formatting and style guidelines |
| `patterns.md` | Design patterns and architecture |
| `hooks.md` | Hook development guidelines |
| `agents.md` | Subagent definition guidelines |

## Rule Format

Rules are markdown files with guidelines Claude should follow:

```markdown
# Security Rules

## CRITICAL

- Never commit API keys, tokens, or credentials
- Always validate user input before use
- Use parameterized queries for database operations
- Sanitize HTML output to prevent XSS

## IMPORTANT

- Use HTTPS for all external requests
- Implement rate limiting on public endpoints
- Log security-relevant events

## RECOMMENDED

- Use dependency scanning in CI/CD
- Regular security audits of dependencies
- Principle of least privilege for service accounts
```

## Built-in Rules Detail

### security.md

Covers:
- Input validation
- SQL injection prevention
- XSS prevention
- Authentication best practices
- Secret management
- Dependency security

### testing.md

Covers:
- Test coverage targets (80%+ for most code)
- Unit test structure
- Integration test patterns
- E2E test guidelines
- Mock vs real implementations
- Test naming conventions

### performance.md

Covers:
- Database query optimization
- Caching strategies
- Memory management
- Async/await patterns
- Bundle size considerations
- Lazy loading

### git-workflow.md

Covers:
- Commit message format
- Branch naming conventions
- PR guidelines
- Merge strategies
- Code review process

### coding-style.md

Covers:
- Naming conventions
- File organization
- Import ordering
- Comment guidelines
- Formatting rules

### patterns.md

Covers:
- Design patterns to use
- Anti-patterns to avoid
- Architecture guidelines
- Dependency injection
- Error handling patterns

### hooks.md

Covers:
- Hook development guidelines
- Cross-platform considerations
- Testing hooks
- Error handling in hooks

### agents.md

Covers:
- Subagent definition format
- Agent specialization
- Inter-agent communication
- Agent testing

## Adding Custom Rules

Create a new rule file:

```bash
code ~/.agent-hub/agents/alice/rules/my-project-rules.md
```

Example custom rule:

```markdown
# Project-Specific Rules

## API Design

- All endpoints must return JSON
- Use RESTful naming conventions
- Include pagination for list endpoints
- Return appropriate HTTP status codes

## Database

- Use Prisma for all database operations
- Include created_at and updated_at on all tables
- Use soft deletes for user-facing data
- Index foreign keys

## Frontend

- Use React Server Components by default
- Client components only when needed (interactivity)
- Tailwind CSS for styling
- No inline styles
```

## Rule Deployment

When you run `agent-hub hire`:

1. Rules are copied from master to project
2. All `.md` files in rules/ are included

```
Master: ~/.agent-hub/agents/alice/rules/
    ↓
Project: .claude/rules/
```

## Rule Priority

When rules conflict:
1. Project-specific rules take precedence
2. User instructions override rules
3. More specific rules override general rules

## Best Practices

1. **Be specific** - Vague rules are ignored
2. **Include examples** - Show what good looks like
3. **Prioritize** - Use CRITICAL, IMPORTANT, RECOMMENDED
4. **Keep updated** - Rules should evolve with the project
5. **Don't over-rule** - Too many rules cause confusion
