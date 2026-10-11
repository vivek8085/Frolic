# Frolic

Frolic is a playful outdoor side-quest app powered by open-weight AI. It gives people a small reason to put their phones down, go outside, and notice something interesting.

Choose a mood, time limit, and difficulty to generate a safe outdoor quest. Complete the quest to earn XP, build badges, submit a reflection, or invite friends to a group camp.

## Features

- AI-generated outdoor quests using Hugging Face Inference Router
- Open-weight `Qwen/Qwen2.5-7B-Instruct` model
- Built-in local quest fallback when Hugging Face is unavailable
- Individual progress, XP, streaks, and badges
- Photo and video evidence submissions
- Personal outdoor camp history
- Group camps with invite links and shareable codes
- MongoDB Atlas persistence
- MongoDB GridFS storage for evidence files
- Render deployment configuration
- Responsive browser interface

## Technology

- Node.js 20+
- Express
- Vanilla HTML, CSS, and JavaScript
- Hugging Face Inference Router
- MongoDB Atlas
- MongoDB GridFS
- Render

## Clone the project

Clone the repository with Git:

```bash
git clone https://github.com/vivek8085/Frolic.git
cd Frolic
```

If you already have the repository cloned, update it with:

```bash
git pull origin main
```

## Install dependencies

Install the Node.js dependencies:

```bash
npm install
```

For a clean deployment-style install, use:

```bash
npm ci
```

## Configure environment variables

Create a local `.env` file from the template:

```bash
copy .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Then update `.env`:

```env
PORT=10000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=frolic
HF_TOKEN=your_huggingface_token
```

Never commit `.env`. It is ignored by Git. Use `.env.example` only as a placeholder template.

### Hugging Face token

Create a Hugging Face access token with inference permission and set it as `HF_TOKEN`.

Frolic sends quest-generation requests through the Hugging Face Inference Router. If `HF_TOKEN` is missing or the service is unavailable, Frolic uses its built-in quest deck instead.

### MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Allow your development machine to connect through Atlas Network Access.
4. Add the MongoDB connection string to `MONGODB_URI`.

Frolic creates and uses these collections:

```text
groupCamps
groupCampInvites
individualCamps
questSubmissions
questEvidence.files
questEvidence.chunks
```

For local development, you may temporarily allow `0.0.0.0/0` in Atlas Network Access, but restrict access for production.

## Run locally

Start the application:

```bash
npm start
```

Open the app at:

```text
http://localhost:10000
```

For development with automatic restart:

```bash
npm run dev
```

## Check the database connection

Frolic exposes a health endpoint:

```text
http://localhost:10000/health
```

With PowerShell:

```powershell
Invoke-RestMethod http://localhost:10000/health
```

A successful response looks like:

```json
{
  "ok": true,
  "service": "frolic",
  "database": "mongodb-atlas"
}
```

To verify a real write, create a group camp or complete a quest. The new document should appear in MongoDB Atlas.

## How to use Frolic

1. Open the application.
2. Select how you feel, how much time you have, and your preferred difficulty.
3. Generate a quest.
4. Go outside and complete it.
5. Upload optional evidence and write a field note.
6. Confirm the observation and safety checks.
7. Submit the quest to earn XP.
8. Use **Group camping** to create a camp and invite friends.

## Group camps

Group camps are stored in MongoDB and support:

- Camp names and hosts
- Outdoor meeting locations
- Map links
- Shared quests
- Invite links
- Short group codes
- Pending and accepted participants

The host can create a camp, copy the group code, and send invite links to friends. Guests can join through an invite link or by entering the group code.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check server and MongoDB connectivity |
| `POST` | `/api/quest` | Generate an outdoor quest |
| `POST` | `/api/submit-quest` | Validate and save quest evidence |
| `POST` | `/api/group-camping` | Create, invite, join, preview, or refresh a group camp |
| `POST` | `/api/individual-camp` | Save an individual camp profile and retrieve quest history |
| `GET` | `/media/:id` | Retrieve stored quest evidence |

## Deploy to Render

The repository includes [render.yaml](./render.yaml).

1. Push the project to GitHub.
2. Create a new Render Web Service or Blueprint.
3. Connect the GitHub repository.
4. Use the following commands if configuring manually:

```text
Build command: npm ci
Start command: npm start
Health check path: /health
```

5. Add these Render environment variables:

```text
MONGODB_URI
MONGODB_DB=frolic
HF_TOKEN
```

After deployment, verify:

```text
https://YOUR-RENDER-SERVICE.onrender.com/health
```

Uploaded evidence is stored in MongoDB GridFS instead of Render's temporary filesystem.

## Open-source AI approach

Frolic uses an open-weight model through Hugging Face rather than depending on a closed model API. The model, prompt structure, safety constraints, and response format can be inspected and changed. The provider can also be replaced later with another compatible inference service or a self-hosted deployment.

The AI is intentionally used to create a short starting point, not to keep users in a conversation. The desired result is a real-world activity away from the screen.

## License

This project is released under the MIT License.
