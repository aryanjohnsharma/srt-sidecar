# SRT Sidecar
## Product Requirements Document (PRD)

**Document version:** 1.1  
**Date:** 7 November 2026  
**Status:** Updated product and technical specification; Phase 0 validation required before model selection is locked  
**Product type:** Open-source, local-first, browser-based subtitle utility / installable PWA  
**Primary deliverable:** A valid, editable, downloadable `.srt` file generated from local audio, with precise control over subtitle cue segmentation.

> **Product thesis:** SRT Sidecar is the independent subtitle step between a finished edit and the editor's timeline. It turns a local audio export into a reviewable, word-timed transcript and a customizable SRT file that can be imported into the user's preferred video editor. It is free to use, open source, and local-first by design.

**Positioning line:** Your subtitles. Your editor. Your choice.

---

## Document control

| Version | Date | Summary |
|---|---|---|
| 1.0 | 13 October 2026 | Initial specification under the working title SRT Studio. |
| 1.1 | 7 November 2026 | Renamed to SRT Sidecar; changed the primary workflow to audio-first; clarified editor-independent positioning; expanded model validation, local processing, engineering architecture, deployment limits, release gates, and implementation plan. |

## Contents

1. Executive Summary
2. Product Vision and Positioning
3. Problem Statement
4. Goals and Non-Goals
5. Target Users and Jobs to Be Done
6. Product Principles
7. Scope and Priorities
8. Core User Journeys
9. Information Architecture and UX Requirements
10. Functional Requirements
11. SRT Generation and Segmentation Specification
12. Technical Architecture
13. AI Model Strategy and Validation
14. Data Model and Local Persistence
15. Non-Functional Requirements
16. Error States and Recovery
17. Acceptance Test Plan
18. Success Metrics
19. Risks and Mitigations
20. Implementation Roadmap
21. Open Decisions and Recommended Defaults
22. Repository Structure and Engineering Standards
23. Privacy, Security, Licensing, and Cost
24. Research Notes and Sources
25. Final Recommendation

---

## 1. Executive Summary

SRT Sidecar is an open-source utility for video editors who finish a video edit, export its audio, generate subtitles outside their editing application, and bring the resulting SRT file back into the timeline. It is designed for editors working in applications such as Adobe Premiere Pro, DaVinci Resolve, CapCut, Filmora, and other software that supports SRT import.

The product does not aim to replace a video editor or become another full-featured online transcription suite. Its job is narrower: provide a fast, reliable, editor-independent path from finished audio to a clean subtitle file. Its defining capability is configurable segmentation based on word-level timestamps, especially one-word-per-cue captions used in short-form video editing.

The primary workflow is:

1. Export audio from the completed video edit.
2. Open SRT Sidecar and select the audio file.
3. Load a compatible speech-recognition model in the browser, downloading model assets when needed.
4. Transcribe locally on the user's device.
5. Review the transcript and listen back against the audio.
6. Choose how words are grouped into subtitle cues.
7. Preview and validate the SRT.
8. Download the `.srt` file and import it into the preferred video editor.

The proposed implementation is a React + TypeScript + Vite web application. Transformers.js provides the browser-facing model pipeline, with ONNX Runtime Web executing supported ONNX models using WebGPU where available and WASM/CPU fallback where supported. The application has no mandatory backend, database, account system, paid transcription API, or server-side GPU in its core workflow.

**Audio-first is an intentional product decision.** Audio export is already part of the target editor's workflow and avoids bringing full video decoding into the first release. Direct video import is a later enhancement, not a launch dependency.

A key technical risk remains: validating that the selected model, quantization, Transformers.js version, browser runtime, and audio pipeline produce reliable word-level timestamps at acceptable speed on representative devices and languages. Phase 0 must prove this before the application UI is expanded.

## 2. Product Vision and Positioning

### 2.1 Product definition

SRT Sidecar is a local-first SRT generation and segmentation tool. It sits between the audio export from a video-editing application and the editor's subtitle-import workflow.

It is:
- A focused subtitle utility, not a video editor.
- A companion to existing editing software, not a replacement for its timeline or effects tools.
- A word-timed transcription and SRT-generation workflow, not merely a paragraph transcript exporter.
- A local-first application that does not upload user media or transcripts to an SRT Sidecar backend.
- An open-source project that users can inspect, self-host, and contribute to.

### 2.2 Positioning statement

For short-form video editors and creators who repeatedly need custom subtitle timing, SRT Sidecar turns an exported audio file into an editable, highly configurable SRT file without locking the user into one editing application or requiring a paid transcription API.

### 2.3 Product promise

**Make subtitles once. Use them in your editor of choice.**

### 2.4 Differentiation

The product is differentiated by the combination of:
- Word-level timing as the foundation of subtitle generation.
- One-word-per-cue output as a first-class use case.
- Adjustable words-per-cue, duration, character, and sentence-boundary rules.
- A review flow tied to audio playback.
- Local processing and no mandatory account or cloud transcription service.
- A standards-based SRT output intended to move between compatible editors.

SRT Sidecar does not promise to outperform every editor's built-in captions or every hosted transcription service. Its value is user control, portability, privacy, transparent processing, and freedom from an editor-specific workflow.

## 3. Problem Statement

Many short-form editors finish an edit in one application, export a separate audio file, upload it to a transcription service, wait for processing, configure or accept the generated subtitle format, download the SRT, and import it back into the original editing project. This workflow creates friction and can introduce cost, waiting time, account requirements, upload/privacy concerns, and limited control over how captions are grouped.

Built-in auto-caption tools are convenient, but users may prefer a separate tool when they need more control over subtitle segmentation, want to move the same SRT between different editors, or do not want their workflow tied to one editor's caption feature.

A normal text transcript is insufficient for word-by-word captions. Each word needs a useful start and end time. SRT Sidecar must preserve word-level timing data and create subtitle cues from that timed data rather than splitting a paragraph and inventing timestamps.

### User problem statement

“I have finished editing a short video. I need to turn its audio into a clean SRT quickly, control whether captions show one word or several words at a time, and import the file back into whichever editor I use, without paying for a transcription service or uploading private audio.”

## 4. Goals and Non-Goals

### 4.1 Goals

1. Generate a valid downloadable `.srt` from a local audio file.
2. Produce and retain individual timed word records for supported model outputs.
3. Make one-word-per-cue output the default and a first-class option.
4. Allow a configurable maximum word count per cue.
5. Support optional maximum duration and maximum character constraints.
6. Support sentence-aware cue boundaries.
7. Allow transcript review and basic text correction before export.
8. Link transcript items to audio playback for verification.
9. Keep media processing, transcription, segmentation, and export on the user's device in the default workflow.
10. Work without user accounts, a database, paid transcription APIs, or server-side inference.
11. Publish the codebase and self-hosting instructions on GitHub.
12. Make SRT output compatible with common NLE import workflows through valid SubRip formatting.

### 4.2 Non-goals for MVP

- Replacing Premiere Pro, DaVinci Resolve, CapCut, Filmora, Final Cut Pro, or another NLE.
- Editing video, adding visual caption styles, applying animations, or rendering/burning subtitles into video.
- Direct timeline integration or proprietary editor project-file generation.
- Cloud transcription, cloud transcript storage, account systems, or user sync.
- Paid tiers, usage quotas, upgrade prompts, or advertising.
- AI chat, summarization, audio cleanup, or general-purpose AI assistant features.
- Speaker diarization as a launch requirement.
- Translation as a launch requirement.
- Full video import and extraction as a launch requirement; this is deferred until audio-first is stable.
- Guaranteeing identical transcription accuracy or speed on all devices.
- Guaranteeing that every codec or every browser is supported.
- Copying another transcription product's protected brand identity, UI assets, or proprietary design.

## 5. Target Users and Jobs to Be Done

### 5.1 Primary persona: Short-form video editor

Edits Reels, TikToks, YouTube Shorts, ads, talking-head clips, and social videos. Usually exports audio from a completed timeline and needs word-by-word or short-group captions with useful timestamps. Imports the SRT into an existing editing application and styles captions there.

### 5.2 Secondary persona: Freelance editor or editing agency

Handles multiple client projects and uses different editing applications depending on the project. Values predictable exports, repeatable settings, fast turnaround, and avoiding another paid subscription.

### 5.3 Secondary persona: Creator or podcaster

Works with voice-overs, interviews, podcasts, and longer audio. Wants to correct transcription errors, listen to individual sections, and choose readable subtitle groupings.

### 5.4 Secondary persona: Privacy-conscious user

Does not want recordings uploaded to a third-party transcription API. Prefers a workflow where files remain in the browser/device and where the processing architecture is understandable.

### 5.5 Jobs to be done

- “Turn the audio from my finished edit into an SRT.”
- “Create one word per subtitle cue for animated captions.”
- “Group words into two, three, or four words per cue.”
- “Keep every subtitle below a chosen duration or character count.”
- “Check an incorrectly recognized word against playback.”
- “Download an SRT that I can import into different video-editing applications.”
- “Do this without a paid transcription API or an account.”

## 6. Product Principles

1. **SRT first:** The primary value is a useful SRT file, not a generic transcript dashboard.
2. **Editor independent:** The result belongs to the user and should work in compatible editing applications.
3. **Word timings are source data:** Never invent word timings by evenly splitting a sentence when actual word-level timestamps are available.
4. **Local by default:** The application must not upload media or transcript content to an SRT Sidecar backend in normal use.
5. **No surprise content:** Never inject a watermark, promotion, attribution cue, or product branding into the exported subtitles.
6. **Visible processing:** Distinguish model download, audio preparation, transcription, transcript review, cue generation, and export.
7. **User verification:** Pair transcript text with playback and provide correction controls.
8. **Honest performance claims:** Model timing is an estimate; speed and compatibility depend on the device, browser, model, and media.
9. **Keep scope focused:** Defer features that do not improve the path from audio export to a usable SRT.

## 7. Scope and Priorities

Priority definitions: **P0** = required for the first usable MVP; **P1** = post-MVP usability and installability; **P2** = later expansion.

| Feature | Priority | Acceptance summary |
|---|---|---|
| Local audio file import | P0 | User can select or drop a supported audio file without sending it to an app backend. |
| Audio validation and preparation | P0 | App checks type, size, duration, decoding support, and prepares model input locally. |
| On-device speech recognition | P0 | Compatible model runs in the browser using supported runtime backend. |
| Word-level timestamps | P0 | Recognized words have finite start and end times where model supports them. |
| Configurable segmentation | P0 | One-word, N-word, duration, character, and sentence-aware options. |
| Transcript review | P0 | User can inspect and correct text before export. |
| Audio playback and seeking | P0 | User can verify transcript timing against original audio. |
| SRT preview and validation | P0 | Preview reflects current settings and output passes structural checks. |
| SRT download | P0 | UTF-8 `.srt` downloads locally without account or server job. |
| Worker-based inference | P0 | Long model work does not freeze the main UI thread. |
| Language selection | P0 | Auto-detect or choose a supported language for selected model. |
| Recent-project persistence | P1 | Completed projects can be reopened in the same browser profile. |
| Installable PWA | P1 | App shell can be installed and cached in supported browsers. |
| Model cache management | P1 | User can see model status, clear cached assets, and retry downloads. |
| Manual word/cue timing editor | P1 | User can adjust timing for selected words or cues. |
| Microphone recording | P1 | User can record audio directly and generate SRT. |
| Direct video import/extraction | P2 | Local FFmpeg.wasm or another validated approach extracts audio from video. |
| Batch processing | P2 | Queue multiple audio files and produce separate SRT files. |
| VTT export | P2 | Add another subtitle format after SRT quality is stable. |
| Translation / diarization | P2 | Add only after the core workflow and local feasibility are validated. |

## 8. Core User Journeys

### 8.1 Primary journey: Audio export to SRT

1. User opens SRT Sidecar.
2. Home screen presents a clear **Choose Audio** action and a short local-processing explanation.
3. User selects or drops an audio file exported from an NLE.
4. App validates the file and shows file name, file size, duration (when available), and format support status.
5. App checks whether the selected model is cached.
6. If not cached, app explains that model assets must be downloaded and shows download progress and model size when known.
7. User selects automatic language detection or a supported language. The first release may keep advanced model selection behind a simple settings control.
8. App prepares audio locally and starts transcription in a Web Worker.
9. App shows transcription progress and allows cancellation when the runtime and job stage support it.
10. Transcript appears with timing information and an audio player.
11. User reviews and corrects text where necessary.
12. User selects **Export SRT**.
13. Export dialog shows Max Words Per Segment with a default of `1` and collapsed advanced controls.
14. User changes segmentation settings. Preview regenerates from stored timed words without rerunning transcription.
15. App validates cue ordering and SRT syntax.
16. User downloads the `.srt` file.
17. User imports the SRT into a compatible video editor and styles/positions subtitles in that editor.

### 8.2 Repeat workflow

If the model remains cached and the user returns in the same browser profile, the model can be reused. If local project history is enabled, the transcript and settings can be reopened without repeating transcription, subject to browser storage persistence. The original source audio is not retained by default, so it may need to be reselected for playback.

### 8.3 Failure workflow

If model download, audio decoding, inference, storage, or export fails, the app should explain what failed and offer a useful recovery action. A model failure must not silently produce an empty or inaccurate SRT.

## 9. Information Architecture and UX Requirements

### 9.1 Home / Recent Files

- Compact brand header: SRT Sidecar.
- Primary action: **Choose Audio** or **Transcribe Audio**.
- Short privacy description: “Your audio is processed on this device. The app does not upload recordings to an SRT Sidecar server. Model files may be downloaded when needed.”
- Recent Files section when local history is available.
- Suggested metadata: file name, date, duration, model/language, status, actions.
- Empty state should lead directly to importing audio.
- No pricing, paywall, upgrade banner, usage meter, account prompt, cloud folder, or social feed.
- Row actions: Open, Rename, Delete local project.

### 9.2 File selection and setup

- Native file picker and drag-and-drop on desktop.
- Validate file content and decode support; do not rely only on file extension.
- Display file name, size, duration when available, and selected model.
- Audio-first formats: WAV and MP3 should be first validation targets. M4A/AAC and other formats are included only after browser compatibility tests.
- Explain any format conversion or model download before it begins.
- Warn when a file exceeds tested duration or memory limits instead of implying universal support.

### 9.3 Transcription progress

Show distinct stages:
- Checking audio file.
- Preparing audio.
- Downloading model (when needed).
- Loading model.
- Transcribing.
- Stitching word timestamps.
- Ready for review.

Progress should be based on real download/model callbacks or measured processing stages where available. Do not fabricate a percentage when the underlying API does not expose meaningful progress.

### 9.4 Transcript review

- Show recognized text in a readable transcript view.
- Make timestamps available for word-level items.
- Provide audio playback, play/pause, seek, current time, total duration, and volume.
- Selecting a word or cue seeks to its start time.
- Optionally highlight the active word during playback when timing data is reliable.
- Allow text correction while preserving timing metadata.
- Explain when an edit changes token boundaries and therefore requires manual timing review.
- Primary action: **Export SRT**.

### 9.5 SRT export dialog

**Dialog title:** Export SRT

Required control:
- **Max Words Per Segment:** integer, minimum `1`, recommended upper bound `20`, default `1`.
- Helper text: “1 = one word per subtitle cue. Higher values group words together.”

Advanced segmentation controls, collapsed by default:
- **Max Duration Per Segment (seconds):** optional positive number; blank means no duration cap.
- **Max Characters Per Segment:** optional positive integer; blank means no character cap.
- **Sentence-Aware Segmentation:** toggle; when enabled, punctuation/boundary detection forces a new cue after a detected sentence ending.

Additional controls may be considered after validation:
- **Preserve Long Pauses:** keep original silence gaps between cues; default on.
- **Minimum Cue Duration:** deferred unless user testing demonstrates need. It can distort original word timing if applied carelessly.

Dialog footer:
- Preview area with cue count and sample cues.
- Download SRT button.
- Cancel button.
- Reset to defaults.
- Settings persist locally for later exports.

### 9.6 Visual direction

- The product should feel like a focused creative utility for editors, not a general SaaS dashboard.
- Use a restrained monochrome/neutral visual system with clear hierarchy and compact information density.
- Use typography and subtle film/post-production references sparingly; avoid visual effects that compete with the transcript.
- Keep primary workflow actions obvious and accessible.
- Do not imitate another transcription service's exact interface or assets.

## 10. Functional Requirements

### FR-01: Local audio import [P0]

The application must accept a user-selected or dropped local audio file. It must not upload the audio to an SRT Sidecar endpoint.

**Acceptance criteria**
- Native picker works in supported desktop browsers.
- Drag-and-drop works in supported desktop browsers.
- App shows filename and file size.
- Supported files are decoded locally.
- Unsupported or corrupt files produce actionable errors.
- Network inspection confirms that no audio payload is sent to an SRT Sidecar application endpoint.

### FR-02: Audio preparation [P0]

The application must decode supported input locally, convert it into the model's expected waveform representation, and prepare manageable chunks where the chosen inference path supports chunked processing.

**Acceptance criteria**
- The model receives the expected sample rate and waveform format.
- Channel handling is deterministic; stereo is downmixed appropriately for the chosen model path.
- Duration and memory are considered before decoding very large files.
- The app reports when a file exceeds tested limits.
- Chunk boundaries and overlap/stride behavior are tested to identify missing or duplicated words.

### FR-03: Model lifecycle [P0]

Load a compatible Whisper ONNX model through Transformers.js and ONNX Runtime Web. Keep the model adapter independent from UI components.

**Acceptance criteria**
- First-time model download is clearly identified.
- Model download progress is shown when available.
- A selected model can be reused from browser cache when available.
- Download failures provide retry and a clear message.
- Model initialization errors provide an actionable fallback suggestion where possible.
- Only the selected model assets are downloaded, not every file in a model repository.

### FR-04: On-device transcription [P0]

Run inference locally in a Web Worker. Attempt WebGPU only when available and compatible; provide a WASM/CPU fallback where supported by the runtime and model.

**Acceptance criteria**
- Main UI remains responsive during inference.
- User can see the active processing stage.
- User can cancel a job where supported; if cancellation cannot interrupt an active inference call, the UI must say so and prevent duplicate jobs.
- Runtime/backend used is visible in diagnostics or settings.
- Failure in WebGPU does not silently produce partial output; fallback behavior is explicit.

### FR-05: Word-level timestamps [P0]

The transcription adapter must request word-level timestamps from a supported automatic-speech-recognition pipeline, such as Transformers.js `return_timestamps: 'word'`, and normalize the returned chunks into individual word records.

**Normalized word record**
- `id`
- `text`
- `startSeconds`
- `endSeconds`
- `index`
- optional `confidence` only if reliable confidence is actually exposed by the model

**Acceptance criteria**
- Short test recordings produce individual timed-word records.
- Every timestamp is finite and non-negative.
- `endSeconds` is greater than `startSeconds` for every exported word.
- Punctuation is preserved and attached to an appropriate token when possible.
- If the model only returns segment-level timestamps, the app must not pretend they are word-level timestamps.
- Word-level timing is described as model-estimated, not guaranteed frame-accurate alignment.

### FR-06: Language and model selection [P0]

The first release must support a multilingual model path and a language selector for languages supported by that model. Automatic language detection may be offered.

**Acceptance criteria**
- UI only lists language options supported by the selected model.
- English, Hindi, and code-switched Hindi-English (Hinglish) are included in the validation dataset.
- Hinglish quality is treated as a benchmark target, not a guarantee.
- Unsupported combinations show a clear warning.
- Model size and quality descriptions are framed as approximate trade-offs rather than guarantees.

### FR-07: Transcript review and correction [P0]

The user must be able to inspect recognized text and make basic corrections before export.

**Acceptance criteria**
- Text edits are reflected in subsequent SRT exports.
- Editing a token's text without changing token boundaries retains its original time interval.
- Splitting one recognized token into multiple words requires explicit timing review or manual timing assignment; the app must not invent precise internal word boundaries silently.
- Merging adjacent words produces a combined display token with a clearly defined start and end time, normally from the first word's start to the last word's end.
- Selecting a timed word seeks the player to its start time.

### FR-08: Audio player and sync [P0]

Provide playback and navigation sufficient to review transcript timing.

**Acceptance criteria**
- Play/pause, seek, current time, duration, and volume work.
- Selecting transcript words seeks to the corresponding start time.
- Active-word highlighting is optional and only used when timing data is reliable.
- Playback and transcript remain synchronized after text correction and project reload.

### FR-09: Segmentation settings [P0]

Generate subtitle cues from stored word-level records. Changing settings must not rerun transcription.

| Setting | Required behavior | Default |
|---|---|---|
| Max Words Per Segment | Maximum number of words grouped into a cue. | `1` |
| Max Duration Per Segment | Optional cap based on last word end minus first word start. | Off |
| Max Characters Per Segment | Optional cap applied to rendered cue text. | Off |
| Sentence-Aware Segmentation | Close a cue at detected sentence boundaries. | Off |
| Preserve Pauses | Keep actual gaps between cue timing intervals. | On |

**Acceptance criteria**
- Max Words = 1 creates one cue per word/token.
- Max Words = 2 and 3 group up to that number of words.
- A stricter enabled duration/character limit closes a cue before adding the next word.
- Sentence-aware boundary takes precedence over filling the remaining word capacity.
- Blank optional values are ignored.
- A single token exceeding a character limit is retained intact and triggers a warning; spoken content is never dropped.

### FR-10: SRT preview, validation, and export [P0]

Serialize the generated cue list into SubRip syntax and download as a UTF-8 `.srt` file.

**Acceptance criteria**
- Sequential cue numbering starts at 1.
- Timestamp line uses `HH:MM:SS,mmm --> HH:MM:SS,mmm`.
- Each cue contains one or more text lines and is separated by a blank line.
- Cue start/end values are non-negative and end is after start.
- Cue ordering is chronological.
- Overlaps and malformed intervals are reported; only safe normalization is automatic and never silent.
- Empty transcript cannot be exported as a successful SRT.
- Export contains only user-recognized or user-edited subtitle text.
- Default filename is `<source-basename>.srt`.
- Download is local and requires no registration or server-side job.

### FR-11: Progress, cancellation, and recovery [P0]

Show useful processing stages and errors.

**Acceptance criteria**
- Model download and transcription progress are distinct.
- Recoverable failures offer retry without discarding a completed transcript.
- Unsupported GPU/runtime errors offer a compatible fallback when available.
- Memory failures suggest shorter audio, a smaller model, or another supported browser/backend.
- UI does not allow accidental concurrent inference jobs on the same model instance.

### FR-12: Recent projects and IndexedDB persistence [P1]

Store transcript and settings locally. Do not persist original audio by default.

**Acceptance criteria**
- Projects persist across reloads when storage remains available.
- Project records store source filename and metadata but do not assume the source file itself is retained.
- Reopened projects clearly indicate when source audio must be reselected for playback.
- User can rename and delete projects.
- User can clear local project data and model cache separately.
- UI warns that browser storage can be cleared or evicted.

### FR-13: PWA and offline support [P1]

Provide a web manifest and service worker for app-shell caching. Model caching must be visible and managed explicitly.

**Acceptance criteria**
- App is installable in supported browsers.
- App shell works offline after it has been cached.
- Offline transcription is available only when the required model assets are cached and retained.
- Model status differentiates Not downloaded, Downloading, Cached, and Error.
- App updates do not silently delete locally stored projects or model assets.

### FR-14: Video input [P2]

Add direct local video import only after the audio workflow is stable. A local media extraction approach may use FFmpeg.wasm or another validated browser implementation.

**Acceptance criteria**
- Video decoding/extraction happens locally.
- User is informed of extra download, memory, and processing cost.
- Codec/container support is tested and documented.
- Unsupported media receives a useful error and an audio-export workaround.
- Multithreaded FFmpeg.wasm is not assumed to work without the necessary cross-origin isolation and SharedArrayBuffer support.

## 11. SRT Generation and Segmentation Specification

### 11.1 Source data

The SRT generator consumes an ordered array of word records. Each record must have displayed text and a start/end timestamp in seconds. The generator must not infer individual word timestamps from paragraph text.

### 11.2 Cue grouping algorithm

1. Normalize each word's display text by trimming only unwanted outer whitespace; retain meaningful punctuation.
2. Start a new cue with the next timed word.
3. Consider adding the next word to the current cue.
4. If sentence-aware mode detects a sentence boundary before the next word, close the cue.
5. If adding the word would exceed the maximum word count, close the cue.
6. If adding the word would exceed the maximum duration, close the cue.
7. If adding the word would exceed the maximum character count, close the cue.
8. If any enabled boundary is reached, begin a new cue with the next word.
9. Cue start is the first word's start; cue end is the last word's end.
10. Join words using natural spacing and avoid inserting spaces before closing punctuation.
11. Preserve silence gaps. Do not stretch a cue through silence by default.
12. Validate the final cue list before serialization.
13. If a single word exceeds a configured character cap, preserve the word in its own cue and show a warning.

### 11.3 Constraint precedence

- Sentence boundary is a hard boundary when sentence-aware mode is enabled.
- Maximum words, duration, and characters are hard upper limits.
- The first reached boundary closes the current cue.
- Original word timings take precedence over visual neatness.
- A single over-limit token is kept intact, never dropped or split automatically.
- Overlapping or invalid model timestamps are flagged. The app must not silently rewrite meaningful timing data.

### 11.4 SRT example: one word per cue

Input:

| Word | Start | End |
|---|---:|---:|
| I | 0.000 | 0.110 |
| mean, | 0.110 | 0.210 |
| I'm | 0.230 | 0.350 |

Output when Max Words Per Segment = 1:

```srt
1
00:00:00,000 --> 00:00:00,110
I

2
00:00:00,110 --> 00:00:00,210
mean,

3
00:00:00,230 --> 00:00:00,350
I'm
```

### 11.5 SRT example: up to two words per cue

```srt
1
00:00:00,000 --> 00:00:00,210
I mean,

2
00:00:00,230 --> 00:00:00,350
I'm
```

### 11.6 Timestamp formatting

- Internal timing uses floating-point seconds or integer milliseconds consistently; conversion must be centralized.
- Serialized SRT timestamps use comma milliseconds.
- Round to milliseconds at serialization, not repeatedly during processing.
- Ensure end time is after start time.
- Preserve actual cue gaps.
- Handle hours beyond 99 only if the serializer/parser and target-editor tests confirm compatibility; otherwise document supported duration limits.

## 12. Technical Architecture

### 12.1 Proposed stack

| Layer | Technology | Role |
|---|---|---|
| UI | React + TypeScript | Component-based application interface. |
| Build | Vite | Development server and static production build. |
| Styling | Tailwind CSS | Utility-first styling. |
| UI primitives | shadcn/ui and Radix UI, selectively | Accessible dialogs, menus, and controls. |
| Icons | Lucide React | Consistent interface icons. |
| AI pipeline | Transformers.js | Model loading and ASR pipeline. |
| Inference runtime | ONNX Runtime Web | Browser model execution. |
| Acceleration | WebGPU when available; WASM/CPU fallback | Device-dependent inference backend. |
| Audio decode | Web Audio API | Decode supported local audio formats. |
| Background processing | Web Worker | Keep inference away from the main UI thread. |
| Local data | IndexedDB | Projects, word records, and preferences. |
| Model cache | Cache API / Transformers.js cache | Reuse model assets where browser storage permits. |
| PWA | Web App Manifest + Service Worker | Installable shell and offline app assets. |
| Hosting | Vercel static deployment | Serve frontend only. |
| Source control | Public GitHub repository | Code, issues, releases, tests, contribution workflow. |
| Test tooling | Vitest + React Testing Library + Playwright | Unit, component, and end-to-end tests. |

The stack is a proposed implementation baseline, not a claim that every dependency/version has been pinned. Pin exact package versions after the Phase 0 proof of concept.

### 12.2 Processing architecture

```text
User-selected local audio file
          |
          v
File validation and metadata
          |
          v
Local audio decode and channel handling
          |
          v
Resample / prepare model waveform
          |
          v
Web Worker
   |      |
   |      +--> Load selected ONNX model via Transformers.js
   |      |       |
   |      |       +--> ONNX Runtime Web (WebGPU or WASM)
   |      |
   |      +--> Chunked inference / overlap handling where validated
   |
   v
Word text + word timestamps
          |
          v
Normalized transcript data
          |
          +--> IndexedDB (local project persistence, P1)
          |
          v
Transcript review and audio playback
          |
          v
Segmentation engine
          |
          v
Cue validation and SRT serialization
          |
          v
UTF-8 Blob -> local browser download
```

### 12.3 Worker communication

Use typed messages between UI and worker. Suggested message types:

- `LOAD_MODEL`
- `MODEL_PROGRESS`
- `MODEL_READY`
- `TRANSCRIBE_AUDIO`
- `TRANSCRIPTION_PROGRESS`
- `TRANSCRIPTION_RESULT`
- `TRANSCRIPTION_ERROR`
- `CANCEL_JOB`
- `DISPOSE_MODEL`

Each job should include a unique job ID. UI should ignore stale messages from cancelled or superseded jobs. Worker must return structured errors that can be shown in the UI without exposing stack traces to ordinary users.

### 12.4 Audio preparation

- Start with the Web Audio API for formats supported by the target browser.
- Prepare the waveform at the sample rate expected by the selected model, commonly 16 kHz for Whisper input.
- Handle mono/stereo consistently and document the downmix method.
- Consider memory usage before decoding large files; decoding the whole file into memory can be expensive.
- Chunk the prepared waveform for inference only after validating chunk length, stride, duplicate suppression, and timestamp offset handling.
- Do not promise arbitrary long-file processing in the first prototype.
- Add FFmpeg.wasm for direct video extraction and extra format coverage only in a later phase.

### 12.5 Model adapter

Create a model adapter interface so the application is not coupled to one model repository:

```ts
interface TranscriptionModelAdapter {
  load(options: ModelLoadOptions): Promise<void>;
  transcribe(audio: Float32Array, options: TranscriptionOptions): Promise<WordTranscript>;
  dispose(): Promise<void>;
}
```

The adapter is responsible for:
- Initializing Transformers.js pipeline.
- Selecting compatible model assets/quantization.
- Selecting device/backend where supported.
- Requesting word-level timestamps.
- Normalizing output into the application's `TimedWord` schema.
- Converting model/runtime errors into structured application errors.

### 12.6 Hosting and model delivery

- Vercel serves the static frontend and app shell only.
- Do not send audio or transcript data through Vercel Functions.
- Do not bundle large model weights into normal frontend deployments.
- Fetch only the selected model assets from a model host such as Hugging Face, subject to that host's terms, availability, CORS behavior, and bandwidth constraints.
- Consider pinning model revisions to immutable commit hashes for reproducible releases.
- Provide a model manifest in the application containing model ID, revision, supported languages, expected files, quantization, approximate download size, and license/provenance URL.
- Vercel currently documents a 100 MB static-file upload limit for Hobby deployments; this is another reason to serve model assets separately. Recheck plan limits before public release.

## 13. AI Model Strategy and Validation

### 13.1 Initial candidate

The first proof-of-concept candidate is:

`onnx-community/whisper-base_timestamped`

The Hugging Face model page documents use with Transformers.js. The current repository includes quantized model variants. The repository page and model asset list must be checked directly when selecting a concrete variant; do not assume the entire repository should be downloaded.

Reference: https://huggingface.co/onnx-community/whisper-base_timestamped

### 13.2 Candidate comparison

| Candidate | Intended role | Decision status |
|---|---|---|
| Whisper Base Timestamped | First multilingual POC candidate | Benchmark first; not yet locked as default. |
| Whisper Small Timestamped | Compare quality/speed against Base | Benchmark if Base quality is insufficient. |
| Whisper Tiny / Tiny multilingual | Potential low-resource fallback | Validate whether word-level timestamp path and quality meet requirements. |
| Other compatible ASR/alignment models | Future alternative | Consider only if Whisper performance is inadequate. |

### 13.3 Required model benchmarks

Evaluate each candidate and quantization on:
- English voice-over with clean studio audio.
- English speech with background music.
- Hindi speech.
- Hinglish/code-switched Hindi-English speech.
- Fast speech and reduced articulation.
- Names, numbers, and technical vocabulary.
- Long pauses and sentence breaks.
- At least one longer audio sample with chunk overlap.

Record:
- First model download size.
- Cached model startup time.
- Transcription duration divided by source audio duration (real-time factor).
- Peak memory or practical memory failure behavior where measurable.
- Word timestamp availability and validity.
- Recognition quality using a manually verified reference transcript.
- Timing quality using manually checked word boundaries on a small test set.
- WebGPU success/failure and WASM fallback behavior.
- Browser and device used.

Do not publish accuracy or speed claims until benchmark data supports them.

### 13.4 Language strategy

- The first release should use a multilingual model where possible.
- Automatic language detection can be offered, but users should be able to specify a known language.
- Hindi and Hinglish are important validation targets. A multilingual model does not guarantee strong code-switching performance.
- English-only models must be clearly marked and must not be presented as multilingual.
- Translation is not part of the MVP. Transcription must preserve the spoken language.

### 13.5 Model and dependency licensing

Review licenses separately for:
- Transformers.js.
- ONNX Runtime Web.
- Original model weights.
- ONNX-converted model repository and quantized files.
- Audio-processing libraries and any FFmpeg.wasm core distribution.

Do not infer that a converted or quantized model artifact automatically inherits the expected license without checking its repository metadata and provenance. Include a `THIRD_PARTY_NOTICES.md` or equivalent in the repository.

## 14. Data Model and Local Persistence

### 14.1 Timed word

```ts
interface TimedWord {
  id: string;
  text: string;
  startSeconds: number;
  endSeconds: number;
  index: number;
  edited?: boolean;
}
```

### 14.2 Subtitle cue

```ts
interface SubtitleCue {
  id: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
  wordIds: string[];
  warnings?: string[];
}
```

### 14.3 Local project

```ts
interface LocalProject {
  id: string;
  sourceName: string;
  sourceSizeBytes?: number;
  sourceDurationSeconds?: number;
  createdAt: number;
  updatedAt: number;
  modelId: string;
  modelRevision?: string;
  language?: string;
  words: TimedWord[];
  lastExportSettings: SrtExportSettings;
}
```

### 14.4 Export settings

```ts
interface SrtExportSettings {
  maxWordsPerCue: number;
  maxDurationSeconds?: number;
  maxCharacters?: number;
  sentenceAware: boolean;
  preservePauses: boolean;
}
```

### 14.5 Persistence rules

- Persist project metadata, transcript words, text edits, and export settings in IndexedDB (P1).
- Do not persist the original audio by default.
- Do not persist temporary waveform buffers or large inference tensors.
- Allow deletion of a project independently from clearing the model cache.
- Use browser storage estimates where available and show a warning when persistence may be at risk.
- Treat local browser storage as best-effort, not a guaranteed permanent archive.
- Encourage users to download important SRT files.

## 15. Non-Functional Requirements

### 15.1 Accuracy and data integrity

- Never silently replace word-level timing with guessed evenly distributed timestamps.
- Keep original timing values through cue segmentation.
- Make timing quality reviewable against playback.
- Preserve user text corrections.
- Validate output before download.

### 15.2 Performance

- Heavy inference must run outside the UI thread.
- First model download should be visible and reusable through cache where possible.
- Avoid downloading multiple models by default.
- Benchmark target devices rather than specifying unsupported universal processing-time guarantees.
- Display a clear warning before processing unusually large files.

### 15.3 Compatibility

Initial target:
- Desktop Chrome and Edge with WebGPU where supported.
- WASM/CPU fallback in supported desktop browsers.
- Firefox and Safari should be tested through the fallback path, not assumed to support WebGPU inference.

The ONNX Runtime Web compatibility table distinguishes WebGPU and WASM support by browser and operating system. The app must feature-detect at runtime and keep a tested compatibility matrix.

### 15.4 Accessibility and usability

- Keyboard-accessible import, dialogs, transcript controls, and export actions.
- Visible focus indicators.
- Labels for all inputs and controls.
- Do not rely on color alone to communicate state.
- Respect reduced-motion preferences.
- Provide useful error text and avoid technical stack traces in the main UI.

### 15.5 Security and privacy

- No media or transcript uploads to SRT Sidecar application servers in normal mode.
- No account, API key, or analytics SDK required.
- Treat file metadata and transcript content as local user data.
- Validate file size/type and handle malformed media safely.
- Revoke temporary object URLs when no longer needed.
- Do not render transcript text as HTML.
- Minimize third-party runtime dependencies.
- Document that the website and model weights must be downloaded, so first use requires internet access.

## 16. Error States and Recovery

| Error | User-facing response / recovery |
|---|---|
| Unsupported audio format | Explain that this browser cannot decode the file; suggest WAV or MP3 export from the editor. |
| Corrupt file | Explain that the file could not be decoded; ask user to re-export it. |
| File too large / memory risk | Explain the limit; suggest shorter audio or a lower-complexity model. |
| Model download failed | Show retry and model-host status; preserve selected file metadata. |
| Model initialization failed | Explain backend/model issue; offer WASM fallback if available. |
| WebGPU unavailable | Switch to supported WASM/CPU backend or explain unavailable configuration. |
| Out of memory | Stop safely; suggest smaller model or shorter audio; do not generate a successful-looking partial SRT. |
| Transcription failed | Preserve completed data if possible and offer retry. |
| Missing word timestamps | Warn that word-by-word export is unavailable for this output; never fabricate precise word timings. |
| Invalid/overlapping timestamps | Flag affected items for review; normalize only when safe and explained. |
| Storage quota exceeded | Allow immediate SRT export; explain that project history could not be saved. |
| Export failed | Keep preview and settings; offer retry. |

## 17. Acceptance Test Plan

### 17.1 SRT engine unit tests

1. One input word creates one cue when max words is 1.
2. Two and three words group correctly when the corresponding limit is selected.
3. Punctuation remains attached to the correct word/token.
4. No space is inserted before closing punctuation.
5. Sentence-aware mode closes a cue at sentence boundaries.
6. Duration limit closes a cue before the next word when exceeded.
7. Character limit closes a cue before the next word when exceeded.
8. A single word that exceeds the character limit is kept intact and flagged.
9. Silence gaps remain between cue intervals.
10. Cue timestamps are chronological and formatted to milliseconds.
11. Invalid or zero-duration tokens are flagged and cannot silently create malformed output.
12. Empty transcript cannot be exported.
13. Cue numbering is sequential.
14. No brand name or promotional text is injected.

### 17.2 AI and audio tests

1. A 60-second WAV file can be decoded and transcribed locally.
2. The selected candidate model returns word-level timestamps using the tested Transformers.js pipeline.
3. Every normalized word has finite, non-negative start/end values.
4. Chunked processing does not introduce obvious duplicate or missing words in the test fixture.
5. English, Hindi, and Hinglish test clips are evaluated against manually verified transcripts.
6. WebGPU path works on selected compatible test hardware or falls back with a clear error.
7. WASM fallback is tested in supported browsers.
8. The main UI remains responsive while inference is running.

### 17.3 Product-flow tests

1. User can select audio, transcribe, review, change SRT settings, preview, and download without an account.
2. Browser network inspection confirms that media and transcript payloads are not sent to an SRT Sidecar endpoint.
3. Refresh restores a saved project when IndexedDB data remains available.
4. Deleting a project removes its local transcript/history.
5. Clearing the model cache does not silently delete project transcripts.
6. Model download and decode failures provide retry/workaround messages.
7. Exported SRT imports successfully into the NLE versions included in the QA matrix.
8. User can use the workflow without a paid API key or backend service.

## 18. Success Metrics

No transcript content or media should be collected as analytics. During development, metrics can be measured locally or in opt-in test sessions.

- **SRT completion rate:** percentage of test jobs that result in a valid SRT download.
- **Time to first export:** elapsed time from file selection to first SRT download.
- **Segmentation correctness:** automated pass rate for word-count and timing rules.
- **Recognition quality:** benchmarked against manually verified reference transcripts.
- **Timing quality:** measured error between estimated and manually checked word boundaries on a sample.
- **Import compatibility:** pass rate for selected NLE import tests.
- **Recoverability:** percentage of simulated failures with a clear recovery path.
- **Privacy integrity:** zero audio/transcript payloads sent to application endpoints during normal processing.
- **Model readiness:** first-load and cached-load success in opt-in testing, if telemetry is ever introduced with explicit disclosure.

## 19. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Word-level timing is inaccurate | Benchmark against reference clips; permit review and manual correction; describe timings as estimates. |
| Model does not support the exact word-timestamp path | Verify the chosen model and runtime in Phase 0 before building around it. |
| Model download is large | Benchmark quantized assets; download only selected files; explain size; offer model choices later. |
| Hinglish/code-switching quality varies | Include representative mixed-language clips in the evaluation set; do not guarantee quality until measured. |
| Slow or low-memory devices | Use a Web Worker, smaller-model option, audio length warnings, and careful buffer disposal. |
| WebGPU support varies | Feature-detect and test WASM fallback. |
| Full-file audio decode consumes memory | Establish tested input limits; add streaming or FFmpeg-based preparation later if required. |
| Browser codec support varies | Maintain a tested format matrix; provide WAV/MP3 workaround. |
| Browser storage can be evicted | Provide immediate export, separate cache management, and clear local-storage warnings. |
| Local inference is slower than hosted GPU | Be transparent about device dependence; optimize for privacy and no per-job server cost. |
| Vercel deployment limits | Host the static app only; keep model weights on a separate model host; recheck plan limits before release. |
| Model/dependency license mismatch | Review exact code, weights, converted assets, and transitive dependency licenses; publish notices. |
| PWA offline expectations are overstated | Clearly distinguish app-shell cache from model cache and offline readiness. |
| Product scope expands excessively | Keep the SRT export workflow central; defer video, translation, diarization, and batch features. |

## 20. Implementation Roadmap

### Phase 0: Technical proof of concept (first milestone)

Build a minimal React/Vite page and one transcription worker.

Tasks:
- Create the project shell and install Transformers.js.
- Load `onnx-community/whisper-base_timestamped` as the first candidate.
- Inspect model file variants and select a quantized option for the benchmark; do not download the entire repository.
- Request `return_timestamps: 'word'`.
- Decode a local WAV file and prepare a model-compatible waveform.
- Run a 60-second English test clip.
- Normalize returned word chunks into `TimedWord[]`.
- Build a minimal SRT serializer and one-word-per-cue output.
- Download the file and validate it with an independent SRT parser or target editor.
- Test WebGPU and WASM paths on at least two representative browser/device configurations.
- Measure model download size, first-load time, cached startup time, runtime, and memory behavior.
- Inspect network traffic to confirm the audio is not uploaded.

**Exit criteria:** A local 60-second audio file can be transcribed to individual timed word records and downloaded as a structurally valid one-word-per-cue SRT without audio being sent to an SRT Sidecar application endpoint. If this cannot be achieved reliably, revise model/runtime selection before continuing.

### Phase 1: Core MVP

- Home / file import screen.
- Audio validation and preparation.
- Model loading and progress states.
- Worker-based inference.
- Word-level transcript view.
- Audio player and seek-to-word behavior.
- Basic text correction.
- SRT segmentation settings.
- Live SRT preview.
- SRT validation and local download.
- Unit tests and end-to-end flow tests.
- README, privacy statement, license and model attribution documentation.

**Exit criteria:** A user completes audio-to-SRT workflow without account, backend, or paid API.

### Phase 2: Reliability and installability

- IndexedDB local project history.
- PWA manifest and service worker.
- Explicit model download/cache manager.
- Offline readiness indicator.
- Manual cue/word timing adjustment.
- More input-format tests.
- Expanded browser/device compatibility matrix.

### Phase 3: Expansion

- Direct video import and local extraction using FFmpeg.wasm or another validated browser approach.
- Batch audio transcription.
- VTT export.
- Subtitle translation.
- Speaker labels/diarization if the local solution is reliable.
- Optional SRT import/edit workflow.

Do not delay the first usable release for Phase 3.

## 21. Open Decisions and Recommended Defaults

| Decision | Recommendation for MVP | Status |
|---|---|---|
| Product name | SRT Sidecar | Confirmed for this PRD. |
| Primary input | Local audio export | Confirmed. |
| Direct video input | Defer to Phase 3 | Recommended. |
| Default segmentation | One word per cue | Confirmed from original requirements. |
| Max words upper bound | 20 initially | Proposed; adjustable after UX testing. |
| Advanced settings | Collapsed by default | Recommended. |
| Sentence-aware mode | Off by default | Recommended. |
| Pause preservation | On by default | Recommended. |
| Initial model candidate | `onnx-community/whisper-base_timestamped` | Benchmark candidate, not final lock. |
| Model quantization | Choose after size/quality benchmark | Open. |
| Primary browser target | Desktop Chromium with WebGPU where supported | Recommended. |
| Fallback | WASM/CPU where supported | Recommended. |
| Language support | Multilingual model; validate English, Hindi, Hinglish | Open pending benchmark. |
| Backend | None for core MVP | Confirmed architectural target. |
| Database | None; IndexedDB locally in P1 | Confirmed architectural target. |
| Analytics | None by default | Recommended. |
| Hosting | Vercel static frontend; model assets external | Recommended. |
| App code license | MIT proposed | Confirm after contributor/dependency review. |
| Model license | Check exact selected model and converted artifacts | Required before release. |
| Local history | Transcript/settings only; no original audio by default | Recommended. |
| Custom domain | Optional | Open. |

## 22. Repository Structure and Engineering Standards

Suggested project layout:

```text
srt-sidecar/
├── public/
│   ├── favicon.svg
│   └── manifest.webmanifest
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── shared/
│   ├── features/
│   │   ├── file-import/
│   │   ├── transcription/
│   │   ├── transcript-editor/
│   │   ├── segmentation/
│   │   ├── srt-export/
│   │   └── recent-files/
│   ├── workers/
│   │   └── transcription.worker.ts
│   ├── lib/
│   │   ├── audio/
│   │   ├── srt/
│   │   └── storage/
│   ├── types/
│   └── main.tsx
├── tests/
│   ├── segmentation/
│   ├── export/
│   └── fixtures/
├── README.md
├── LICENSE
├── THIRD_PARTY_NOTICES.md
├── PRIVACY.md
└── package.json
```

### Engineering standards

- TypeScript strict mode should be enabled.
- Keep transcription/model code out of UI components.
- Keep SRT segmentation and serialization pure and independently testable.
- Use typed worker messages and unique job IDs.
- Centralize timestamp conversion and serialization.
- Avoid storing large binary data unnecessarily.
- Pin dependency and model revisions for releases.
- Use automated tests for all segmentation boundary conditions.
- Include audio test fixtures and manually verified transcript/timing references where licensing permits.
- Do not commit model weight files or user media to Git.
- Keep a `THIRD_PARTY_NOTICES.md` and document model provenance.

## 23. Privacy, Security, Licensing, and Cost

### 23.1 Privacy statement

SRT Sidecar processes audio locally in the user's browser. In the normal workflow, the application does not upload user audio or transcripts to an SRT Sidecar server. The website's static assets and model files may be downloaded from hosting/model providers. The privacy notice must distinguish those downloads from media uploads and must not claim that the entire first-use experience is offline.

### 23.2 Security

- No account credentials or API keys are required.
- No media upload endpoint is part of the core architecture.
- User transcript text must be rendered as text, not unsafe HTML.
- Revoke object URLs and release buffers when no longer required.
- Validate file size, MIME hints, duration, and decoder output.
- Keep dependencies limited and update them deliberately.
- Avoid remote scripts that can access user media or transcript content.

### 23.3 Licensing

- MIT is the proposed license for application code, subject to final project decision.
- Transformers.js, ONNX Runtime Web, model weights, converted model artifacts, and FFmpeg.wasm distributions must be reviewed individually.
- Include attribution, license copies, version/revision identifiers, and model provenance in repository documentation.

### 23.4 Cost model

The architecture avoids paid transcription APIs, hosted inference GPUs, backend functions, and managed databases for the core workflow. Development and small-scale deployment may be possible on free tiers, but no permanent zero-cost guarantee is made. Hosting plans have usage limits; custom domains may cost money; model-host bandwidth and terms can change. Recheck current provider terms and limits before launch and as usage grows.

## 24. Research Notes and Sources

The following official documentation and model resources informed the technical update. Links were checked on 7 November 2026. They are implementation references, not endorsements or guarantees of performance.

1. **Hugging Face Transformers.js pipeline API** — automatic speech recognition, word-level timestamp option (`return_timestamps: 'word'`), chunk and stride parameters, language/task settings.  
   https://huggingface.co/docs/transformers.js/api/pipelines
2. **Transformers.js v3.8.1 pipeline API** — versioned documentation for the stable 3.8.1 reference. Pin and recheck the actual npm version during implementation.  
   https://huggingface.co/docs/transformers.js/v3.8.1/en/api/pipelines
3. **ONNX Community Whisper Base Timestamped** — model repository and Transformers.js usage instructions.  
   https://huggingface.co/onnx-community/whisper-base_timestamped
4. **ONNX Runtime Web documentation** — JavaScript/web execution providers and browser support.  
   https://onnxruntime.ai/docs/get-started/with-javascript/web.html
5. **Vercel limits** — current platform limits, including static file upload limits by plan.  
   https://vercel.com/docs/limits
6. **FFmpeg.wasm usage documentation** — local browser media processing and worker/core loading examples.  
   https://ffmpegwasm.netlify.app/docs/getting-started/usage/
7. **FFmpeg.wasm FAQ** — performance and multithread considerations.  
   https://ffmpegwasm.netlify.app/docs/faq/
8. **MDN BaseAudioContext.decodeAudioData** — browser audio decoding API.  
   https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
9. **MDN Storage quotas and eviction criteria** — browser storage is quota-managed and may be evicted.  
   https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
10. **OpenAI Whisper repository** — original speech-recognition implementation and license information. Check the precise license of each selected converted model artifact separately.  
    https://github.com/openai/whisper

## 25. Final Recommendation

Start with Phase 0 and keep the first deliverable deliberately small: load a compatible local model, transcribe a short local audio file into individual timed words, group those words into one-word SRT cues, and download a valid `.srt` file.

Do not invest in a full dashboard, PWA, video extraction, batch mode, or advanced editor features until this proof works on the target browser/device matrix. The central product risk is not the interface; it is the quality, timing, download size, and runtime behavior of local word-level transcription.

Once Phase 0 passes, build the review, segmentation, preview, and export workflow around the validated transcription adapter. This keeps SRT Sidecar focused on its core promise: an independent, local-first subtitle handoff tool for editors.
