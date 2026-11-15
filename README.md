# Superdimension · 超维空间

A playable pixel island that connects exploration, resident routines, and AI-assisted knowledge exchange. Created by Shuoguang (Simon) Zhu through product design and AI-assisted development.

## Implemented

- Walkable Canvas world with interiors, six residents, day/night cycles, synthesized music, fog-night chapters, and saved progression.
- Resident routines, interactions, voyages and themed gatherings, with server-owned game state.
- Four background AI roles with source-linked reports, input versions, corrections, and bounded usage.
- Separate visitor and island-owner access, protected configuration, and an email workflow with address verification and explicit confirmation.
- React frontend, Node.js service, SQLite persistence, automated tests, and original code-drawn visuals.

## Run locally

Install Node.js 24+ and npm, then run from this directory:

```sh
npm install
cp .env.example .env
# Edit .env and set OWNER_PASSWORD to a unique password of at least 12 characters.
npm run dev
```

Open http://127.0.0.1:5174. AI reports require your own OpenAI or DeepSeek credentials and a compatible model. Email requires your own SMTP or Resend configuration. The .env.example file documents the settings. Configure the island identity in the owner interface.

```sh
npm test
npm run build
npm start
```

The production build is served at http://127.0.0.1:8787. A public deployment requires HTTPS, persistent SQLite storage and production configuration. SQLite and the job queue currently target a single server process.

Optional PDF/DOCX profile imports require Python 3 with `pypdf` and `python-docx`. Set `RESUME_PYTHON` to the Python executable if needed.

Release checks on November 15, 2026 passed all 188 automated tests and the Vite production build.

## Documentation

- [Setup and runtime behavior](docs/RUNNING.md)
- [Visual design](docs/DESIGN.md)
- [Fog-night story system](docs/FOG-NIGHTS-v05.md)
- [Resident life](docs/resident-life-delivery.md)
- [Voyages and gatherings](docs/voyage-v2-delivery.md)
- [Mail configuration](docs/MAIL-SETUP.md)
- [Assets and dependencies](docs/ASSETS.md)

This repository contains the application and public product documentation. Each installation creates its own local data. AI-generated reports require source review; automated tests use synthetic fixtures.

## License

MIT for this project's code and documentation. Third-party packages retain their own licenses. Visuals and sound are drawn or synthesized in code; see the asset record.
