# Kids English Picture Game V2

React + TypeScript version of the kids picture-based English learning game.

## Features

- 207 vocabulary words split into reusable data modules.
- Default `All` mode with category filters, including `Jobs`.
- Listen-and-choose gameplay with scoring, streaks, best score, and volume controls.
- Browser speech synthesis plus Web Audio feedback effects.
- Round engine prevents recent target-word repeats.
- Mobile-first layout with the game area shown before controls.

## Commands

```powershell
npm install
npm run dev
npm test
npm run lint
npm run build
npm run deploy:cloudflare
```

## Deployment

Cloudflare Pages is the primary deployment target:

- Production: https://kids-english-picture-game-v2.pages.dev
- Deploy command: `npm run deploy:cloudflare`

Netlify is no longer the primary deployment target for this project.

## Structure

```text
src/data/vocabulary.ts   vocabulary and categories
src/logic/round.ts       round selection and scoring
src/logic/audio.ts       speech and sound effects
src/App.tsx              game UI composition
```
