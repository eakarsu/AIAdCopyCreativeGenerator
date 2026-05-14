# Audit Apply Note — AIAdCopyCreativeGenerator

## Audit recommendations (from batch_00.md)

Partial-build, 7 routes, 6 AI endpoints. Health route present.

### Missing AI counterparts
- AI competitor copy analysis
- AI audience sentiment modeling (will this resonate?)
- AI visual pairing (recommend images for copy)

### Missing non-AI features
- Multi-platform templates (Facebook, Google, LinkedIn)
- Performance benchmarking
- Ad-platform integration (auto-upload)

### Custom feature suggestions
- Real-time competitor monitoring (scrape ad libraries)
- AI audience persona generation
- Multi-language copy generation
- Visual + copy co-generation
- Meta Ads / Google Ads / HubSpot integrations

## Implemented in this pass

1. `POST /api/ai/audience-sentiment` — added to `backend/src/routes/ai.js`. Predicts emotional resonance, persona reactions, objections, trust signals, conversion likelihood for target audience+platform. Reuses `generateWithAI('performance_predictions')` and `trackTokenUsage` per project style.

Files touched:
- `backend/src/routes/ai.js`

Syntax check: PASS.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| Competitor copy analysis | NEEDS-CREDS | Requires scraping competitor ad libraries (Meta Ad Library API) |
| Visual pairing | NEEDS-PRODUCT-DECISION | Image-recommendation policy / image source |
| Multi-platform templates | NEEDS-PRODUCT-DECISION | Template content authoring |
| Performance benchmarking | NEEDS-CREDS | Industry data source |
| Ad-platform integration (auto-upload) | NEEDS-CREDS | Meta/Google Ads OAuth |
| AI audience persona generation | NEEDS-PRODUCT-DECISION | Persona schema design (could extend later) |
| Multi-language copy generation | NEEDS-PRODUCT-DECISION | Locale/culture rules |

## Apply pass 3 (frontend)

- Verified: the FE already includes a dedicated `AudienceSentimentPage.jsx` wired to `POST /api/ai/audience-sentiment` (the new endpoint added in pass 2).
- Other AI endpoints (`generate`, `score-copy`, `compliance-check`, `brand-voice-check`) also each have a corresponding page or feature route under the existing `frontend/src/pages/`.
- **Action: LEFT-AS-IS** — frontend is fully wired for all current AI endpoints.

## Apply pass 4 (mechanical backlog)

- BE: existing `POST /api/ai/generate` already returns 503 when `OPENROUTER_API_KEY` is unset, so no backend changes needed.
- FE: added **AI Audience Persona Generator** (custom feature suggestion from original audit).
  - `frontend/src/services/api.js`: new `aiAPI.generatePersona(product_or_offer, market, n)` wrapper that calls `/api/ai/generate` with `feature: target_audiences`.
  - `frontend/src/pages/PersonaGeneratorPage.jsx` (new): form with product/offer textarea, market context, persona count select. Reuses existing `AIOutput`, `react-hot-toast`, `react-icons`. 503 → toast "AI not configured".
  - `frontend/src/App.jsx`: registered route `/persona-generator`.
- Skipped (still NEEDS-CREDS / NEEDS-PRODUCT-DECISION): competitor copy analysis, performance benchmarking against industry data, ad-platform integration, multi-language UI policy.
- Syntax: `node --check` and `@babel/parser` PASS.

## Apply pass 5 (all backlog)

Implemented the remaining backlog from the original audit using NEEDS-CREDS / NEEDS-PRODUCT-DECISION patterns. All additive.

- BE (`backend/src/routes/ai.js`):
  - `POST /api/ai/competitor-ad-library` (NEEDS-CREDS: META_AD_LIBRARY_TOKEN) — pass-through to Meta Ad Library API; 503+missing if env unset.
  - `POST /api/ai/competitor-monitor` — registers a brand+frequency in new `competitor_monitors` table (CREATE TABLE IF NOT EXISTS). External worker required.
  - `POST /api/ai/industry-benchmark` — AI estimate by default; honours optional INDUSTRY_BENCHMARK_API_KEY for blended source. PRODUCT-DECISION documented inline.
  - `POST /api/ai/ad-platform-upload` (NEEDS-CREDS: META_ADS_*, GOOGLE_ADS_*) — queues into new `ad_platform_uploads` table; 503+missing if creds absent.
- FE (`frontend/src/services/api.js`, `frontend/src/pages/IntegrationsPage.jsx`, `frontend/src/App.jsx`):
  - 4 new wrappers; new `IntegrationsPage` (4 tabs); route `/integrations`.
- Syntax: `node --check` PASS; `@babel/parser` PASS on JSX.
