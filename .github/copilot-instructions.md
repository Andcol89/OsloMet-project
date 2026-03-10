# Copilot AI Agent Instructions for OsloMet-project

## Project Architecture Overview
- **Monorepo** with `backend` (Node.js/Express/TypeScript) and `frontend` (React/TypeScript/Vite) apps.
- **Backend**: Entry at `backend/src/server.ts` (currently empty, expected to be Express server). Uses `express`, `cors`, `dotenv`. Build with `tsc`, run in dev with `nodemon`/`tsx`.
- **Frontend**: Entry at `frontend/src/main.tsx`, main app in `frontend/src/App.tsx`. Uses React 19, Vite for dev/build, strict TypeScript config. Components in `frontend/src/components`.
- **Docs**: API integration and CORS setup described in `docs/POWERAUTOMATEGRAPHQL.md`.
- **Auth Utility**: `generate_basic_auth.py` generates a Basic Auth token from `.env` for GraphQL API use.

## Key Workflows
- **Backend**
  - Dev: `npm run dev` (nodemon + tsx)
  - Build: `npm run build` (tsc)
  - Start: `npm start` (runs built JS)
  - Main file: `backend/src/server.ts`
- **Frontend**
  - Dev: `npm run dev` (Vite dev server)
  - Build: `npm run build` (TypeScript + Vite)
  - Preview: `npm run preview`
  - Lint: `npm run lint`
  - Main file: `frontend/src/main.tsx`

## Patterns & Conventions
- **TypeScript strictness**: Both apps use strict TS settings. Type errors should be fixed immediately.
- **React**: Functional components, hooks, and prop interfaces (see `StudentCard.tsx`).
- **API Calls**: Frontend fetches student data from backend at `http://localhost:3001/api/student` (see `App.tsx`).
- **.env Usage**: Backend and utility scripts expect secrets in `.env` (see `generate_basic_auth.py`).
- **CORS**: Backend must set CORS headers for frontend integration (see docs/POWERAUTOMATEGRAPHQL.md).

## Integration Points
- **Frontend ↔ Backend**: Communicate via REST API (POST `/api/student`).
- **Backend ↔ External**: Likely integrates with GraphQL API using Basic Auth (see `generate_basic_auth.py`).
- **Power Automate**: Docs describe CORS for Power Automate HTTP triggers.

## Recommendations for AI Agents
- Always check and update TypeScript types/interfaces when changing data models.
- When adding backend endpoints, ensure CORS and body parsing are configured.
- Use `.env` for secrets; never hardcode credentials.
- Reference `docs/POWERAUTOMATEGRAPHQL.md` for CORS and API integration details.
- Keep build/test/lint scripts in sync with `package.json` in each app.

## Example: Adding a Backend Route
```ts
// backend/src/server.ts
import express from 'express';
const app = express();
app.use(express.json());
app.use(require('cors')());
app.post('/api/student', (req, res) => {
  // ...handle request
});
app.listen(3001);
```

---

Update this file if project structure or conventions change. For questions, see the relevant `README.md` or docs folder.