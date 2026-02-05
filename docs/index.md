---
layout: home
hero:
  name: "Agent Hub"
  text: "Your AI Agent Command Center"
  tagline: Create, configure, and deploy AI agents with persistent memory and built-in superpowers
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: What is Agent Hub?
      link: /what-is-agent-hub

features:
  - icon: 🤖
    title: Agent Identity
    details: Define personality, tenets, and principles that persist across sessions. Your agent remembers who it is.
  - icon: 🧠
    title: Persistent Memory
    details: Vector-indexed memory with semantic search. Daily logs, long-term memory, and automatic session continuity.
  - icon: 🎓
    title: Continuous Learning
    details: Built-in instinct system learns from your coding patterns. Your agent gets smarter over time.
  - icon: 🔧
    title: Skills & Commands
    details: Built-in skills for memory management, coding rules, and slash commands. Easily extensible with your own.
  - icon: 🎯
    title: Multi-Platform
    details: Deploy to Claude Code, Codex CLI, and more with target adapters. Cross-platform Node.js.
  - icon: 📦
    title: Easy Sharing
    details: Export agents as archives, import from others, clone and customize. Share your best setups.
---

## Quick Install

```bash
npm install -g agent-hub
```

## Quick Start

```bash
# Create an agent
agent-hub create alice -s "Full-stack engineer"

# Deploy to your project
cd your-project
agent-hub hire alice

# Update agent later with new files
agent-hub hire alice --update

# Restart Claude Code - agent is active!
```

## What's Included

Every agent comes with starter templates:

- **2 Skills** - Memory summarization, skill creator
- **2 Rules** - Coding style, performance
- **1 Command** - `/extract-session`
- **2 Hooks** - Session start reminder, pre-compact memory prompt

You can easily extend your agent by adding custom skills, rules, commands, and subagents.
