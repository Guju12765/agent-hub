# Embeddings Setup

Agent Hub uses embeddings for semantic memory search. You have three options:

## Option 1: Local Embeddings (Default)

**No API key required.** On first use, a small model (~300MB) downloads automatically.

```bash
# Just use it - model downloads on first memory search
agent-hub hire alice
```

::: info First Run
The first `memory_search` will take longer as the model downloads. Subsequent searches are fast.
:::

### Requirements
- Node.js 22+ (LTS recommended)
- ~500MB disk space for model cache

### Model Location
Models are cached in:
- **Linux/macOS:** `~/.cache/llama-cpp/`
- **Windows:** `%LOCALAPPDATA%\llama-cpp\`

---

## Option 2: OpenAI Embeddings

Fast, high-quality embeddings using OpenAI's API.

### Setup

```bash
# Set your API key
export OPENAI_API_KEY=sk-your-key-here

# Windows PowerShell
$env:OPENAI_API_KEY = "sk-your-key-here"
```

### Cost
- Model: `text-embedding-3-small`
- ~$0.02 per 1M tokens
- Typical usage: pennies per month

### Get an API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account or sign in
3. Navigate to API Keys
4. Create new secret key

---

## Option 3: Google Gemini Embeddings (Free Tier)

Free embeddings using Google's Gemini API.

### Setup

```bash
# Set your API key
export GOOGLE_API_KEY=your-key-here

# Or use GEMINI_API_KEY
export GEMINI_API_KEY=your-key-here
```

### Cost
- **Free tier:** 1,500 requests/day
- More than enough for typical usage

### Get an API Key
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google account
3. Click "Get API Key"
4. Create key in new or existing project

---

## Auto Selection

Agent Hub automatically selects the best available provider:

```
1. OpenAI    (if OPENAI_API_KEY is set)
2. Gemini    (if GOOGLE_API_KEY or GEMINI_API_KEY is set)
3. Local     (fallback, always available)
```

You don't need to configure anything - just set an API key if you have one, or use local embeddings by default.

---

## Comparison

| Provider | Speed | Quality | Cost | Setup |
|----------|-------|---------|------|-------|
| **Local** | Medium | Good | Free | None |
| **OpenAI** | Fast | Excellent | ~$0.02/1M tokens | API key |
| **Gemini** | Fast | Very Good | Free tier | API key |

### Recommendations

- **Just getting started?** Use local (no setup needed)
- **Want best quality?** Use OpenAI
- **Want free + fast?** Use Gemini free tier
- **Offline/private?** Use local

---

## Troubleshooting

### Local embeddings not working

```
Error: node-llama-cpp not available
```

**Fix:** Ensure you're using Node.js 22+:
```bash
node --version  # Should be v22.x.x or higher
```

### API key not recognized

Ensure the environment variable is set in the same terminal:

```bash
# Check if set
echo $OPENAI_API_KEY

# Set it for current session
export OPENAI_API_KEY=sk-...

# Or add to your shell profile (~/.bashrc, ~/.zshrc)
echo 'export OPENAI_API_KEY=sk-...' >> ~/.zshrc
```

### Model download fails

If local model download fails:

```bash
# Clear cache and retry
rm -rf ~/.cache/llama-cpp/

# On Windows
rmdir /s %LOCALAPPDATA%\llama-cpp
```
