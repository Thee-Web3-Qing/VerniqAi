---
name: Verniq Stack
description: Core architecture, key decisions, and integration notes for the Verniq project.
---

## Stack
- React + Vite (Wouter routing), Clerk auth, Postgres + Drizzle ORM
- Express api-server on port 8080
- Tailwind v4, framer-motion, Space Grotesk font
- `rounded-none` everywhere, `font-mono` for labels
- Qwen endpoint: `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions`, model `qwen3.7-plus`

## Core logic
- Voice DNA logic is client-side in `artifacts/verniq/src/lib/verniq-store.ts`
- All AI calls route through `artifacts/api-server/src/routes/`

## Features implemented (3 major additions)
1. **0G Blockchain storage** — `artifacts/api-server/src/lib/zerog.ts`; profile + org voice uploaded in background after save; hash/tx stored on profiles.voice_dna_0g_hash / voice_dna_0g_tx; requires ZERO_G_PRIVATE_KEY env var; gracefully skips if not set
2. **B2B Brand Voice (Orgs)** — full org CRUD in `api-server/src/routes/orgs.ts`; org voice blending averages member Voice DNAs; pages: OrgNew, OrgDashboard, JoinOrg; routes /org/new, /org/join/:code, /org/:slug
3. **Multilingual (Sarvam)** — 11 languages (English + 10 Indian); language selector on Onboarding; stored on profiles.language; passed to Qwen system prompt in generate.ts

## DB schema additions
- profiles: `language`, `voice_dna_0g_hash`, `voice_dna_0g_tx`
- New tables: `organizations`, `org_members`
- Migrations already run

## API client hooks
- Org hooks live at the end of `lib/api-client-react/src/generated/api.ts`
- Types in `lib/api-client-react/src/generated/api.schemas.ts`: Language, Organization, OrgListItem, OrgMemberDto, CreateOrgInput, JoinOrgInput, BuildOrgVoiceResult

**Why:** All these were added manually (not generated) since there's no OpenAPI spec workflow for this project; future additions should follow same pattern — append to api.ts and api.schemas.ts.
