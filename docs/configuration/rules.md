# Rules Configuration

Rules are coding guidelines that Claude follows during development.

**Location:** `~/.agent-hub/agents/<name>/rules/`

## Default Rules

Every agent comes with two built-in rules:

| Rule | Purpose |
|------|---------|
| `coding-style.md` | Code formatting and style guidelines |
| `performance.md` | Performance considerations, optimization patterns |

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

### coding-style.md

Covers:
- Naming conventions
- File organization
- Import ordering
- Comment guidelines
- Formatting rules

### performance.md

Covers:
- Database query optimization
- Caching strategies
- Memory management
- Async/await patterns
- Bundle size considerations
- Lazy loading

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

### Updating Rules

If you add new rules to the master and want to deploy them to an existing project:

```bash
# Update with conflict resolution
agent-hub hire alice --update

# Force replace all rules
agent-hub hire alice --update --force-replace
```

When rule files conflict, you'll be prompted to keep, replace, merge, or diff each file.

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
