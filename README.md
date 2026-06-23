# Verniq — Voice DNA Platform

> AI that writes in your exact voice. On every platform.

**HackHazards '26 Submission — NAMESPACE Community**

---

## The Problem

AI content tools produce generic output that sounds the same regardless of who's using them. Creators spend years developing a unique voice — their tone, rhythm, sentence patterns, word choices — but AI strips all of that away.

There's also no mechanism for creators to monetize their voice. And brands scaling content output across teams inevitably drift from their authentic identity.

---

## The Solution

**Verniq** builds a **Voice DNA** — an AI model trained on samples of your own writing that captures your exact tone, rhythm, vocabulary, and style. Every piece of content generated sounds genuinely like you.

On top of that, Verniq is the first platform where creators can **sell access to their Voice DNA** — buyers pay in crypto directly to the creator's wallet, with no intermediaries. Voice DNA is stored permanently on the **0G blockchain**, so it's truly yours.

---

## Key Features

- **Voice DNA Builder** — Paste writing samples, Verniq maps your tone, rhythm, word choices, and style into a personal AI model
- **Multi-Platform Content** — Generate TikTok scripts, Twitter threads, LinkedIn posts, newsletters, YouTube descriptions in your exact voice
- **Voice Match Score** — Every output is rated for fidelity to your Voice DNA (avg. 94%)
- **Voice Marketplace** — Buy and sell Voice DNA access; payments in crypto on 8 chains (ETH, SOL, BSC, Polygon, Base, Optimism, Tron, TON)
- **B2B Brand Voice** — Blend a team's voices into one unified brand identity
- **Multilingual** — 23 languages supported, your voice localized for any market
- **0G Blockchain Storage** — Voice DNA stored permanently on-chain
- **Public Feed** — Share content, grow your audience, get discovered

---

## Demo

- **Live Product:** [verniq.xyz](https://verniq.xyz)
- **Demo Video:** [verniq.xyz/video](https://verniq.xyz/video)
- **GitHub:** [github.com/Thee-Web3-Qing/VerniqAi](https://github.com/Thee-Web3-Qing/VerniqAi)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind v4 |
| Auth | Clerk |
| Backend | Express.js |
| Database | PostgreSQL + Drizzle ORM |
| AI — Voice Generation | Qwen 3.7 (Alibaba Cloud MaaS) |
| AI — Text to Speech | ElevenLabs |
| Blockchain Storage | 0G Network |
| Payment Verification | Alchemy API (EVM chains) + TronGrid + tonapi.io |
| Deployment | Replit |

**Supported Payment Chains:**
BSC · Ethereum · Polygon · Optimism · Base · Tron · Solana · TON

---

## How It Works

1. **Build your Voice DNA** — Paste 2+ writing samples. Verniq analyzes your patterns across tone, rhythm, vocabulary, sentence structure, and punctuation habits.

2. **Generate content** — Pick a platform (Twitter, LinkedIn, TikTok, Newsletter, etc.), drop your idea, and generate. Content comes back in your exact voice with a match score.

3. **Share to the feed** — Publish generated content to the public Verniq feed to build an audience and get discovered.

4. **Monetize your voice** — Set a price, connect a crypto wallet, and list your Voice DNA on the marketplace. Buyers pay on-chain; you receive directly, no cut taken.

5. **Buy creator voices** — Browse the marketplace, pay in crypto, and generate content that sounds like the top creator in your niche.

---

## Architecture

```
verniq/
├── artifacts/
│   ├── verniq/          # React + Vite frontend
│   └── api-server/      # Express backend (port 8080)
├── lib/
│   ├── db/              # Drizzle ORM schema + migrations
│   └── api-client-react/# React Query hooks (generated)
└── lib/api-spec/        # OpenAPI contract
```

**Database tables:** `profiles` · `drafts` · `organizations` · `feed_posts` · `voice_purchases`

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/verniq run dev
```

**Required environment variables:**
```
DATABASE_URL=
QWEN_API_KEY=
ALCHEMY_API_KEY=
SARVAM_API_KEY=
ZERO_G_PRIVATE_KEY=
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

---

## Team

**Thee-Web3-Qing** — Builder

---

## Tracks & Themes

- Web3 / Blockchain
- AI / Machine Learning
- Creator Economy
- Developer Tools

---

*Built for HackHazards '26 — NAMESPACE Community · May–July 2026*
