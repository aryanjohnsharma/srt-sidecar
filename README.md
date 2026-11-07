# SRT Sidecar

**Turn audio into editable, word-timed subtitles. Keep the workflow local.**

SRT Sidecar is a browser-based subtitle editor for creators who want an SRT they can actually refine before it reaches the timeline. Pick an audio file, generate a transcript on your device, fix the words and timing, then export.

No account. No audio upload to an SRT Sidecar server.

## What it does

- Transcribes audio locally in a Web Worker with Whisper Base.
- Lets you edit transcript text and adjust cue timing.
- Groups words into subtitle cues and checks SRT timing before export.
- Saves recent project text and settings in IndexedDB. Audio files are not saved.
- Reopens projects for editing or export; reconnect the original audio to resume playback.
- Includes a sample project to explore the editor without downloading the model.

## Run it

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. Preview it locally with `npm run preview`.

## How transcription works

The app uses [`onnx-community/whisper-base_timestamped`](https://huggingface.co/onnx-community/whisper-base_timestamped) through Transformers.js. Model assets download the first time you transcribe and are cached by the browser when available. The app tries WebGPU and retries with WASM if WebGPU returns incomplete word timings.

The first 60-second synthetic English smoke check completed through the WASM retry and produced 123 timed words with valid SRT cues. It is a pipeline check, not a quality benchmark. Accuracy across real recordings, speakers, languages, browsers, and devices still needs broader evaluation. [See validation notes](docs/VALIDATION.md).

## Privacy and offline use

Audio decoding and transcription run in the browser. Audio and transcript text are not sent to an SRT Sidecar server. The browser does fetch model assets from Hugging Face. The service worker caches the app shell; offline transcription also requires the model and inference runtime to be cached.

See [PRIVACY.md](PRIVACY.md) for details.

## Deploy

The app is a static Vite site. For Vercel, use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |

The core workflow needs no server functions or environment variables.

## Stack

React · TypeScript · Vite · Transformers.js · ONNX Runtime Web · IndexedDB

## Credits and licensing

See [third-party notices](THIRD_PARTY_NOTICES.md) for component, icon, model, and dependency credits. The project uses React Bits Dither, ReactDrops Liquid Glass Logo, and Pikaicons. Review the included ReactDrops component license and the model repository license before redistributing the source or choosing a project-wide license.
