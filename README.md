# Kids English Picture Game V2

React + TypeScript version of the kids picture-based English learning game.

## Features

- 207 vocabulary words split into reusable data modules.
- Default `All` mode with category filters, including `Jobs`.
- Listen-and-choose gameplay with scoring, streaks, best score, and volume controls.
- Browser speech synthesis plus Web Audio feedback effects.
- Local MP3 pronunciation trial for selected high-frequency words with TTS fallback.
- Round engine prevents recent target-word repeats.
- Cloudflare Pages Functions + D1 persistence for answer events and per-word progress.
- Mobile-first layout with the game area shown before controls.

## Commands

```powershell
npm install
npm run dev
npm test
npm run lint
npm run build
npm run db:migrate
npm run deploy:cloudflare
```

## Deployment

Cloudflare Pages is the primary deployment target:

- Production: https://kids-english-picture-game-v2.pages.dev
- Deploy command: `npm run deploy:cloudflare`
- Database migration: `npm run db:migrate`

Netlify is no longer the primary deployment target for this project.

## Structure

```text
src/data/vocabulary.ts   vocabulary and categories
src/logic/round.ts       round selection and scoring
src/logic/learningApi.ts cloud answer persistence client
src/logic/audio.ts       speech and sound effects
src/App.tsx              game UI composition
functions/api/answer.js  save answer events to Cloudflare D1
functions/api/progress.js read player progress summary
migrations/              D1 schema migrations
```
