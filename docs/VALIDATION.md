# Validation notes

## Historical 60-second browser smoke check

On 2026-11-07, the earlier Transformers.js 3.8.1 worker was exercised with a locally generated 60-second, mono, 16 kHz synthetic English speech WAV. This is a historical check of browser decode/resample, worker inference, timestamp validation, cue creation, and SRT serialization.

- The first WebGPU inference returned incomplete word timing, so that version retried with WASM. The current app uses the WASM runtime directly.
- The WASM retry completed with 123 words, 123 one-word cues, zero invalid timestamps, and zero cue validation issues.
- The generated output contained sequential SRT cue numbers and valid timestamp blocks. The first recognized words began “Welcome to the 1 minute sidecar audio check”; the final word was “result.”
- The first-run duration was about 251 seconds, including model setup and download. This is not a warm-cache performance measurement.
- The review and SRT export screens were separately exercised with the app's built-in sample project; the exported file had 18 sequential, structurally valid cues.

This is a smoke check, not an accuracy benchmark. It uses synthetic English speech and does not establish transcription quality across speakers, accents, noise conditions, Hindi/Hinglish, browsers, or hardware.

## Current browser upload-to-export check

On 2026-11-08, a locally supplied 16.7-second MP3 was selected in the app and transcribed in the browser workflow with Transformers.js 4.3.2 and the quantized WASM runtime.

- Model download progress advanced as one aggregate percentage across required assets, then changed to an animated active state during inference instead of resetting the percentage.
- The app returned 68 word-timed transcript entries and opened the review editor.
- Export produced 68 SRT cues with sequential numbering, valid positive start/end times, and chronologically ordered starts.
- A second warm-cache run completed at a 390 × 844 CSS viewport with the same 68 words. The document had no horizontal overflow.
- The first run was tested at the browser's desktop viewport. The narrow run is responsive viewport emulation on a desktop browser, not a test on physical phone hardware.

These runs verify a short local workflow, not recognition quality or performance across all real recordings, devices, or languages.

## Remaining validation

- Test representative real recordings and manually score word error rate and timestamp quality.
- Measure warm and cold inference time and memory use across supported browsers and device classes.
- Validate supported languages, including Hindi/Hinglish, and document known model limitations.
- Exercise editing and save/reopen with a real audio transcript, and test on physical phone hardware.
- Verify the production build and deployed PWA behavior after the remaining product checks.
