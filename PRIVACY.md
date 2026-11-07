# Privacy

SRT Sidecar processes selected audio in the browser on the user's device. The application does not send audio or transcript content to an SRT Sidecar backend.

On the first transcription, the browser downloads the selected speech model from Hugging Face. The site itself must also be downloaded from its hosting provider. Those downloads require an internet connection. Browser caching may make model assets available for later sessions, subject to browser storage behavior.

The app does not retain the source audio. When a transcript is ready, the app saves the transcript words, timing, segmentation settings, source filename, and project name in IndexedDB on this device so the project can be reopened in the same browser profile. Reopened projects can be exported before the original audio is reselected; audio playback needs that file again. You can rename or delete projects, or clear project history separately from the downloaded Whisper model cache.

Browser storage is managed by the browser and may be cleared or evicted. Export an SRT when you need a durable copy. The app shell can be cached by the service worker after an online visit; offline transcription also depends on the model and inference runtime assets remaining cached.
