# SRT Sidecar

SRT Sidecar turns a local audio export into editable, word-timed subtitles you can bring into your video editor. The app is a React + TypeScript + Vite frontend; media decoding, speech recognition, cue generation, and SRT creation run in the browser.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`, then preview it with `npm run preview`.

The page shows a two-second, reduced-motion-aware logo splash before lazy-loading the application interface. It uses ReactDrops' Liquid Glass Logo, React Bits' Dither background, and the Pikaicons free React pack for interface icons. The working interface uses a light theme. A PWA manifest and service worker cache the app shell after the first visit. The larger inference runtime and Whisper model cache separately when used; offline transcription needs both runtime and model assets to remain cached.

## Current scope

The frontend includes local audio selection and playback, on-device transcription in a Web Worker, transcript correction, manual cue-boundary timing adjustments, configurable cue grouping, SRT validation and local UTF-8 export. Recent projects save transcript text and settings in IndexedDB; source audio is never saved. Reopened projects can be exported immediately, and playback returns after reconnecting the original audio file. A sample project is available without downloading a model.

The selected model is `onnx-community/whisper-base_timestamped`, loaded through Transformers.js. The model is fetched on first transcription and cached by the browser when available. A 60-second synthetic English smoke check produced 123 timed words and valid one-word SRT cues. WebGPU returned incomplete word timing on that run, so the worker retried with WASM and completed successfully. First-run elapsed time was about 251 seconds including model setup and download. This single synthetic run is not a representative accuracy or performance benchmark; see [validation notes](docs/VALIDATION.md).

## Deployment

This is a static Vite app and can be deployed to Vercel with the default Vite settings:

- Build command: `npm run build`
- Output directory: `dist`

No server functions or environment variables are required for the core workflow. Model weights are loaded from the model host at runtime and are not bundled into the app build.

## Privacy

Audio is decoded and transcribed in the user's browser. The app does not send audio or transcript text to an SRT Sidecar server. The browser downloads the application and, when transcription is started, model assets from Hugging Face. See [PRIVACY.md](PRIVACY.md).

## License and model attribution

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The Pikaicons MIT notice is included in `public/licenses/PIKAICONS-MIT.txt`. The ReactDrops component license is included in `src/components/REACTDROPS_LICENSE.txt`; review it before publishing source code or applying a project-wide license. Verify the exact model repository license and dependency notices before a public release.
