/// <reference lib="webworker" />
type Request = { type: 'transcribe'; audio: Float32Array; language: string }
const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = async (event: MessageEvent<Request>) => {
  const { audio, language } = event.data
  try {
    ctx.postMessage({ type: 'status', message: 'Preparing speech model', progress: 0 })
    const { pipeline, env } = await import('@huggingface/transformers')
    env.allowLocalModels = false
    env.useBrowserCache = true
    const progress_callback = (progress: { status?: string; progress?: number }) => {
      ctx.postMessage({ type: 'status', message: progress.status === 'progress' ? 'Downloading speech model' : 'Preparing speech model', progress: progress.progress ?? 0 })
    }
    const transcribeWith = async (device: 'webgpu' | 'wasm') => {
      const transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base_timestamped', { dtype: 'q8', device, progress_callback })
      ctx.postMessage({ type: 'status', message: device === 'webgpu' ? 'Transcribing with WebGPU' : 'Transcribing with WASM', progress: 0 })
      return await transcriber(audio, { return_timestamps: 'word', language: language || undefined, chunk_length_s: 30, stride_length_s: 5 }) as { chunks?: Array<{ text: string; timestamp: [number | null, number | null] }> }
    }
    const canUseWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
    let result: { chunks?: Array<{ text: string; timestamp: [number | null, number | null] }> }
    let deviceUsed: 'webgpu' | 'wasm' = 'wasm'
    if (canUseWebGPU) {
      try { result = await transcribeWith('webgpu'); deviceUsed = 'webgpu' }
      catch {
        ctx.postMessage({ type: 'status', message: 'WebGPU could not run this model. Falling back to WASM', progress: 0 })
        result = await transcribeWith('wasm')
      }
    } else result = await transcribeWith('wasm')
    let textChunks = (result.chunks ?? []).filter((chunk) => chunk.text.trim())
    const hasIncompleteTimestamps = (chunks: typeof textChunks) => chunks.some((chunk) => {
      if (!chunk.timestamp || chunk.timestamp[0] == null || chunk.timestamp[1] == null) return true
      return !Number.isFinite(chunk.timestamp[0]) || !Number.isFinite(chunk.timestamp[1]) || chunk.timestamp[0] < 0 || chunk.timestamp[1] <= chunk.timestamp[0]
    })
    if (deviceUsed === 'webgpu' && hasIncompleteTimestamps(textChunks)) {
      ctx.postMessage({ type: 'status', message: 'WebGPU returned incomplete word timing. Retrying with WASM', progress: 0 })
      result = await transcribeWith('wasm')
      deviceUsed = 'wasm'
      textChunks = (result.chunks ?? []).filter((chunk) => chunk.text.trim())
    }
    const invalidTimestamp = textChunks.some((chunk) => {
      if (!chunk.timestamp || chunk.timestamp[0] == null || chunk.timestamp[1] == null) return true
      return !Number.isFinite(chunk.timestamp[0]) || !Number.isFinite(chunk.timestamp[1]) || chunk.timestamp[0] < 0 || chunk.timestamp[1] <= chunk.timestamp[0]
    })
    if (invalidTimestamp) throw new Error('The model returned incomplete word timing. No SRT was created. Try a shorter file or retry the transcription.')
    const words = textChunks.flatMap((chunk, i) => {
      if (!chunk.timestamp || chunk.timestamp[0] == null || chunk.timestamp[1] == null) return []
      const [start, end] = chunk.timestamp
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return []
      return [{ id: `w-${i}`, text: chunk.text.trim(), start, end }]
    }).filter((word) => word.text).sort((a, b) => a.start - b.start || a.end - b.end)
    if (!words.length) throw new Error('This model did not return word-level timestamps for the selected audio. Try a different supported file.')
    ctx.postMessage({ type: 'complete', words })
  } catch (error) {
    const detail = error instanceof Error ? error.message : ''
    const message = /memory|allocation/i.test(detail)
      ? 'The browser ran out of memory. Try a shorter audio file and close other tabs before retrying.'
      : /fetch|network|download/i.test(detail)
        ? 'The Whisper model could not be downloaded. Check your connection and retry; the selected audio stays on this device.'
        : /webgpu|wasm|backend|runtime/i.test(detail)
          ? 'This browser could not start a supported speech model runtime. Try an up-to-date desktop Chromium browser and retry.'
          : detail || 'Transcription could not be completed. Retry with the same audio or choose another supported file.'
    ctx.postMessage({ type: 'error', message })
  }
}

export {}
