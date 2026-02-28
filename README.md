# ALM  On-Chain AI Agent

ALM is an autonomous AI agent operating on the Solana blockchain. It monitors the Solana AI ecosystem, answers on-chain queries, and communicates in structured AGENT_SPEC format readable by both humans and machines.

**Live:** https://ai-bot-project-lime.vercel.app

---

## Identity

```
agent_id      : alm
agent_name    : ALM
agent_version : 1.0.0
wallet        : DbzFutGThzbMNaDyqvdzWugdZuhnaqtWyfD9qp9GZRRV
status        : active
protocol      : Solana Agent Protocol (SAP)
```

---

## What ALM does

| Skill | Description |
|---|---|
| `balance_checker` | SOL + SPL token balances for any wallet |
| `price_monitor` | Real-time prices: SOL, USDC, BONK, JUP via CoinGecko |
| `transaction_analyzer` | Full transaction history by address or signature |
| `network_status` | Solana mainnet health, current slot, TPS |

**Registry:** Monitors 11 active Solana AI agents (Eliza, GOAT, Drift Keeper, Jito MEV, BonkBot and others). GitHub activity crawled every 30 minutes. Reputation scoring 0-100.

**OpenClaw compatible:** `/manifest` endpoint exposes ALM skills for external agent integrations.

---

## Response format (AGENT_SPEC v1)

Every reply follows this exact structure:

```
Intent:       what was understood
Assumptions:  defaults used
Summary:      human-readable answer
Result JSON:  structured machine-readable output
Next step:    one suggested follow-up
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Chat interface |
| `/agent` | ALM public profile + reputation |
| `/registry` | Live Solana agent registry |
| `/manifest` | OpenClaw skill manifest |

---

## Stack

- **Runtime:** Node.js + TypeScript
- **AI:** OpenAI gpt-4o-mini
- **Blockchain:** Solana mainnet via `@solana/web3.js`
- **Data:** DexScreener, CoinGecko, GitHub API
- **Deploy:** Vercel serverless

---

## Run locally

```bash
git clone https://github.com/gish1337/alm-agent
cd alm-agent
npm install
cp .env.example .env
# fill in OPENAI_API_KEY
npm run dev
```

Server runs on `http://localhost:3000`

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | yes | OpenAI API key |
| `AI_MODEL_NAME` | no | default: gpt-4o-mini |
| `AGENT_WALLET_PUBLIC` | no | ALM public key |
| `SOLANA_RPC_URL` | no | default: mainnet |
| `GITHUB_TOKEN` | recommended | 5000 req/h vs 60 |

---

## Project structure

```
api/
  index.ts               Vercel serverless entry
src/
  ai/
    model.ts             OpenAI / Ollama adapter
    processor.ts         AGENT_SPEC prompt + skill routing
  agent-protocol/
    index.ts             SAP Protocol core
    profile.ts           ALM identity + reputation
    registry.ts          Agent registry API
    seed.ts              11 pre-seeded agents
    skills.ts            Skill definitions
  bot/
    web.ts               Express server + all routes
  config/
    index.ts             Env config loader
  monitor/
    crawler.ts           30-min GitHub + DexScreener crawler
    dexscreener.ts       Token price fetcher
    github.ts            GitHub API client
  solana/
    agent.ts             Solana RPC wrapper
    commands.ts          Blockchain command handlers
public/
  index.html             Chat UI
  agent.html             Agent profile
  registry.html          Agent registry
  manifest.html          OpenClaw manifest
  logo.svg               ALM logo
```

---

## License

MIT
