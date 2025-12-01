# Language Learning Tutor

Interactive language learning web app with speech-to-text, text-to-speech, AI tutoring, goals tracking, progress visualization, and journaling. Built with Vite + React + TypeScript and shadcn/ui components.

## Features

- Conversation with AI tutor using configurable providers (`openai`, `groq`, `claude`)
- Speech-to-Text (STT) and Text-to-Speech (TTS) via an Audio API
- Settings panel for provider, models, language, mode, and system prompt
- Goals management, progress charts, and journaling
- Feedback analysis with common errors aggregation
- Responsive, accessible UI using shadcn/ui and Tailwind CSS

## Tech Stack

- `React` + `TypeScript` with `Vite`
- `shadcn/ui` component library
- Providers: `openai`, `groq`, `anthropic`

## Quick Start

1. Install dependencies
   
   ```bash
   npm install
   ```

2. Configure environment
   
   - Copy `.env.example` to `.env` and fill values (do NOT commit `.env`).
   - Required variables:
     - `VITE_AUDIO_API_BASE` or `VITE_AUDIO_API_BASE_LOCAL`
     - `VITE_OPENAI_API_KEY` (optional if using OpenAI)
     - `VITE_GROQ_API_KEY` (optional if using Groq)
     - `VITE_ANTHROPIC_API_KEY` (optional if using Anthropic)
     - `VITE_TTS_DEFAULT_VOICE` (optional)
     - `VITE_LANGUAGES` (optional comma-separated list)

3. Run the app
   
   ```bash
   npm run dev
   ```

4. Build and preview
   
   ```bash
   npm run build
   npm run preview
   ```

## Environment Variables

- `VITE_AUDIO_API_BASE`: Primary Audio API base URL, e.g. `https://your-audio-api.example.com`
- `VITE_AUDIO_API_BASE_LOCAL`: Local fallback, e.g. `http://localhost:3001`
- `VITE_OPENAI_API_KEY`, `VITE_GROQ_API_KEY`, `VITE_ANTHROPIC_API_KEY`: Provider API keys
- `VITE_TTS_DEFAULT_VOICE`: Default TTS voice name
- `VITE_LANGUAGES`: Optional language list override, e.g. `english,spanish,french`
- `VITE_SYSTEM_PROMPT`: Optional system prompt string
- `VITE_OPENAI_MODEL`, `VITE_GROQ_MODEL`, `VITE_ANTHROPIC_MODEL`: Production model identifiers
- `VITE_TTS_MODEL`: Production TTS model id
- `VITE_TTS_FORMAT`: Production audio format (e.g., `wav`)
- `VITE_STT_MODEL`: Production STT model id
- `VITE_LOG_ENDPOINT`: Optional log ingestion endpoint
- `VITE_METRICS_ENDPOINT`: Optional usage metrics endpoint
- `VITE_ANTHROPIC_MAX_TOKENS`: Required for Anthropic SDK requests

`.env` is ignored by Git; only `.env.example` is tracked. Never commit real keys.

## Audio API Endpoints

The frontend expects an Audio API with the following endpoints:

- `GET /voices` → `string[]` of available voices
- `GET /languages` → `string[]` of available languages
- `POST /tts` → body: `{ model: string, voice: string, input: string, response_format: 'wav' }` returns WAV audio
- `POST /transcribe` → multipart form `{ file, model, language }` returns `{ text: string }`

Models and formats are provided via environment configuration.

## AI Providers

- Providers supported: `openai`, `groq`, `claude`
- Models are required and must be set via Settings or env
- System prompt can be set in Settings or via env

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run preview` — preview built app

## Security

- Do not hardcode secrets or API keys anywhere in the source
- Use environment variables via `import.meta.env.*`
- `.gitignore` ignores `.env` and `.env.*`; only `.env.example` is tracked
- If a secret was accidentally committed, scrub history before pushing (GitHub push protection will block)
 - Do not expose provider keys in the browser; use a backend proxy for provider calls in production

## Troubleshooting

- Detached HEAD: you are on a commit, not a branch. Run `git switch main` or `git switch -c main`.
- Push protection blocked: remove secrets from commits and rewrite history before pushing.
- Audio API unreachable: verify `VITE_AUDIO_API_BASE` or `VITE_AUDIO_API_BASE_LOCAL` and health check in Settings.
 - Missing models: set `VITE_OPENAI_MODEL`, `VITE_GROQ_MODEL`, `VITE_ANTHROPIC_MODEL` or configure via Settings.

## Project Structure (selected)

- `src/App.tsx` — main app composition
- `src/features/` — UI feature panels (header, settings, conversation, feedback, goals, progress, journal)
- `src/lib/audio/` — `tts.ts`, `stt.ts` for audio integration
- `src/lib/providers/` — AI provider clients and chat/analysis helpers
- `src/components/ui/` — shadcn/ui components

## Contributing

- Fork the repo, create a feature branch, and open a PR when ready.
- Ensure you never commit `.env` or real secrets.
