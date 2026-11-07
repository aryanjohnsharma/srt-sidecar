# Validation notes

## 60-second browser transcription smoke check

On 2026-11-07, the app's transcription worker was exercised with a locally generated 60-second, mono, 16 kHz synthetic English speech WAV. This checks the browser decode/resample, worker inference, word timestamp validation, cue creation, and SRT serialization path.

- The first WebGPU inference returned incomplete word timing. The worker now detects that condition and retries with WASM.
- The WASM retry completed with 123 words, 123 one-word cues, zero invalid timestamps, and zero cue validation issues.
- The generated output contained sequential SRT cue numbers and valid timestamp blocks. The first recognized words began “Welcome to the 1 minute sidecar audio check”; the final word was “result.”
- The first-run duration was about 251 seconds, including model setup and download. This is not a warm-cache performance measurement.
- The review and SRT export screens were separately exercised with the app's built-in sample project; the exported file had 18 sequential, structurally valid cues.

This is a smoke check, not an accuracy benchmark. It uses synthetic English speech and does not establish transcription quality across speakers, accents, noise conditions, Hindi/Hinglish, browsers, or hardware. The WAV was fed to the same app worker through a temporary local harness because the browser file chooser could not be driven in this environment; full upload-to-export interaction with that WAV remains unverified. The temporary harness was removed after the run.

## Remaining validation

- Test representative real recordings and manually score word error rate and timestamp quality.
- Measure warm and cold inference time and memory use across supported browsers and device classes.
- Validate supported languages, including Hindi/Hinglish, and document known model limitations.
- Exercise the complete user upload, transcribe, edit, save/reopen, and export flow with a real audio file.
- Verify the production build and deployed PWA behavior after the remaining product checks.
