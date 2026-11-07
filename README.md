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

## How transcription works

The app uses [`onnx-community/whisper-base_timestamped`](https://huggingface.co/onnx-community/whisper-base_timestamped) through Transformers.js. Model assets download the first time you transcribe and are cached by the browser when available. The app tries WebGPU and retries with WASM if WebGPU returns incomplete word timings.

The first 60-second synthetic English smoke check completed through the WASM retry and produced 123 timed words with valid SRT cues. It is a pipeline check, not a quality benchmark. Accuracy across real recordings, speakers, languages, browsers, and devices still needs broader evaluation. [See validation notes](docs/VALIDATION.md).

## Stack

<p>
  <img src="docs/assets/stack-icons/react.svg" width="20" height="20" alt="" /> React&nbsp;&nbsp;
  <img src="docs/assets/stack-icons/typescript.svg" width="20" height="20" alt="" /> TypeScript&nbsp;&nbsp;
  <img src="docs/assets/stack-icons/vite.svg" width="20" height="20" alt="" /> Vite&nbsp;&nbsp;
  <img src="docs/assets/stack-icons/transformers.svg" width="20" height="20" alt="" /> Transformers.js&nbsp;&nbsp;
  <img src="docs/assets/stack-icons/onnx.svg" width="20" height="20" alt="" /> ONNX Runtime Web&nbsp;&nbsp;
  <img src="docs/assets/stack-icons/indexeddb.svg" width="20" height="20" alt="" /> IndexedDB
</p>

## Credits and licensing

See [third-party notices](THIRD_PARTY_NOTICES.md) for component, icon, model, and dependency credits. The project uses React Bits Dither, ReactDrops Liquid Glass Logo, and Pikaicons. Review the included ReactDrops component license and the model repository license before redistributing the source or choosing a project-wide license.
