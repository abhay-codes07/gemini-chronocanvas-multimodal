# ChronoCanvas: The Immersive World Weaver

![ChronoCanvas](https://placehold.co/1400x700/04070d/f3f7ff?text=ChronoCanvas+Hero+Image)

ChronoCanvas is a voice-first storytelling experience built for the Gemini Live Agent Challenge (Creative Storyteller track). Instead of traditional chat bubbles, users hold one microphone button, describe a world, and receive a single flowing canvas of narration, generated visuals, and spoken playback.

## Elevator Pitch

ChronoCanvas breaks the text-box paradigm by treating storytelling as a live cinematic sequence. The user speaks once, then the interface streams an interleaved multimodal experience where narration appears with motion, visuals materialize inline, and audio voiceover plays in sync.

## Multimodal UX: See, Hear, and Speak

- Speak: Web Speech API captures voice from a hold-to-speak interaction.
- See: Streaming narration appears with typing and fade animations; generated visuals render inline with blur-to-focus transitions.
- Hear: Narration chunks are queued into speech synthesis for fluid voice playback.
- Live Interleaving: Backend streams Server-Sent Events (SSE) so text and visuals arrive progressively.

## Architecture

```mermaid
flowchart TD
  A[User Holds Mic] --> B[Web Speech API - SpeechRecognition]
  B --> C[Next.js Client Request /api/weave]
  C --> D[Next.js API Route app/api/weave]
  D --> E[Gemini 1.5 Pro via Google GenAI SDK]
  E --> F[Interleaved JSON Chunks]
  F --> D
  D --> G[Visual Prompt Handler]
  G --> H[Cloud Storage Upload Utility]
  H --> I[Public Asset URL]
  I --> D
  D --> J[SSE Stream to Client]
  J --> K[CanvasRenderer + Framer Motion]
  K --> L[Inline Narration + Visual Rendering]
  K --> M[Web Speech API - speechSynthesis]
```

## Google Cloud Usage

- Google Cloud Run hosts the production containerized Next.js app.
- Google Cloud Storage stores generated visual assets and serves public URLs.
- Deployment automation is provided through `deploy.sh` with `gcloud builds submit` and `gcloud run deploy`.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + Framer Motion
- Google GenAI SDK (`@google/generative-ai`) with `gemini-1.5-pro-latest`
- Google Cloud Storage SDK (`@google-cloud/storage`)
- Web Speech API (`SpeechRecognition` + `speechSynthesis`)

## Reproducibility: Local Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   GCP_PROJECT_ID=your_project_id
   GCP_CLIENT_EMAIL=your_service_account_email
   GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GCP_STORAGE_BUCKET=your_bucket_name
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`.

## Cloud Run Deployment

1. Ensure authenticated gcloud CLI and enabled APIs (Cloud Build, Cloud Run, Artifact Registry).
2. Export required environment variables (`GCP_PROJECT_ID`, `GEMINI_API_KEY`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY`, `GCP_STORAGE_BUCKET`).
3. Run:
   ```bash
   bash deploy.sh
   ```

## Security Notes

- No API keys are hardcoded in source files.
- Secrets are consumed exclusively through environment variables.
- Cloud credentials are expected via secure deployment configuration.
