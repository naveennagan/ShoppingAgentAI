# AI Shopping Assistant

An AI-powered e-commerce app built with Next.js 16, React 19, and Google Gemini AI.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Google Gemini AI
- TypeScript
- Zod (schema validation)
- Lucide React (icons)

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env.local` file based on `.env.example`:

```
GEMINI_API_KEY=your_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.0-flash-lite
GEMINI_MODEL=gemini-2.0-flash-lite
```

Get your Gemini API key from [https://ai.google.dev/](https://ai.google.dev/)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/chat/           # AI chat API route
│   ├── cart/               # Cart page
│   ├── checkout/           # Checkout flow
│   ├── products/           # Product listing & detail pages
│   └── tracking/           # Order tracking
├── components/             # React components
│   ├── AiChatPanel.tsx     # AI chat panel
│   ├── AiChatWidget.tsx    # Floating chat widget
│   ├── AiSuggestionToast.tsx
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   └── Providers.tsx
├── context/
│   └── CartContext.tsx      # Cart state management
└── lib/
    ├── agent/intents.ts     # AI intent detection
    ├── products.ts          # Product catalog & deals
    └── prompts.ts           # AI system prompts

packages/
└── ai-shopping-assistant/   # Standalone AI assistant package
    └── src/
        ├── AIShoppingAssistant.ts  # Main assistant class
        ├── ContextExtractor.ts     # DOM context extraction
        ├── SchemaGenerator.ts      # Dynamic schema generation
        ├── config.ts               # Model configuration
        ├── prompts.ts              # Prompt templates
        ├── types.ts                # TypeScript types
        └── useAIAssistant.ts       # React hook
```

## MCP (Model Context Protocol) Configuration

This project uses MCP servers to extend Kiro's capabilities. MCP lets the AI assistant connect to external tools and services through a standardized protocol.

### How It Works

```
You (in Kiro chat)
  → Ask Kiro to do something (e.g., "check Slack for messages")
    → Kiro calls the appropriate MCP tool
      → MCP server (runs locally via uvx) receives the call
        → Server makes API request to the external service
          → Response flows back to Kiro
```

MCP servers run as local processes on your machine. No data goes through third-party servers.

### Configured Servers

Configuration lives in `.kiro/settings/mcp.json`:

#### 1. AWS Documentation (`aws-docs`)
- Searches and reads AWS documentation directly from Kiro
- Useful for looking up service docs, API references, and best practices
- Package: `awslabs.aws-documentation-mcp-server`

#### 2. Slack (`slack`)
- Read messages from Slack channels
- Send messages and reply to threads
- List channels and users
- Package: `mcp-slack`
- Requires: Slack Bot Token (`xoxb-...`)

### Slack MCP Setup

1. Create a Slack App at [https://api.slack.com/apps](https://api.slack.com/apps)
2. Add Bot Token Scopes under "OAuth & Permissions":
   - `channels:history` — read messages in public channels
   - `channels:read` — list channels
   - `chat:write` — send messages
   - Add `groups:history` and `groups:read` only if you need private channels
3. Install the app to your workspace
4. Copy the Bot Token (`xoxb-...`) and add it to `.kiro/settings/mcp.json`
5. Invite the bot to specific channels only (the bot can only see channels it's been invited to)

### Corporate Proxy / SSL Notes

If you're behind a corporate proxy, you may need:
- `UV_NATIVE_TLS=true` — tells `uvx` to use system TLS instead of bundled certs
- SSL monkey-patching for Python-based MCP servers (see the `slack` config in `mcp.json` for an example)

### Prerequisites

MCP servers run via `uvx`, which requires the `uv` Python package manager:

```bash
brew install uv
```
