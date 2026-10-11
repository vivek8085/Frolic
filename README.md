# Frolic

[![Deploy to Hatchable](https://hatchable.com/deploy-button.svg)](https://hatchable.com/deploy?repo=https://github.com/vivek8085/Frolic)

A playful, mobile-first outdoor quest game powered by open-weight AI. Generate real-world mini missions, earn XP, collect badges, and spend less time scrolling.

## MongoDB Atlas + Render

The app runs as a Node/Express service backed by MongoDB Atlas. Hugging Face Inference Router generates quests with `Qwen/Qwen2.5-7B-Instruct` when `HF_TOKEN` is configured; a local quest deck remains available when the API is unavailable.

- `groupCamps` and `groupCampInvites` power shared camps; `individualCamps` stores each explorer's personal camp profile and `questSubmissions` stores their completed outdoor reflections.
- Quest evidence is stored in the Atlas GridFS bucket `questEvidence`, so Render's ephemeral filesystem is never used for uploads.
- `GET /health` verifies the Render service can reach Atlas.

### Local development

1. Copy `.env.example` to `.env`.
2. Add a MongoDB Atlas connection string. In Atlas, allow the Render outbound IP range or temporarily use `0.0.0.0/0` for a hackathon demo.
3. Run `npm install` and `npm start`.
4. Open `http://localhost:10000`.

### Render deployment

Create a Render Web Service from this repository. `render.yaml` supplies the build/start commands; add `MONGODB_URI` as a secret environment variable in Render. Keep the Atlas database user least-privileged and never commit `.env`.

This architecture makes Atlas visible in the demo: a quest submission writes structured metadata and streams its evidence into GridFS, while Render hosts the always-on AI runtime and frontend.

Individual camp data is written through `POST /api/individual-camp` after a quest is approved. Group camps use `POST /api/group-camping` for creation, invites, joining, and crew refreshes.

This folder is a complete Hatchable project. Everything the app needs is in these files: pages, API routes, database migrations, seed data, and the hatchable.toml manifest that declares the services and keys it uses.

## Run your own copy

1. Go to https://hatchable.com/deploy
2. Bring this folder as a .zip, or point the importer at a Git repository that contains it
3. Your copy gets its own database, its own URL, and connects to your own keys

## About Hatchable

Hatchable is where AI-built apps go live. Connect the AI you already use and it can build, deploy, and run apps like this one for you.

Built on Hatchable. https://hatchable.com
