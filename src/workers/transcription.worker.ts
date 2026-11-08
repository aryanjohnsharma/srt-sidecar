/// <reference lib="webworker" />
type Request = { type: 'transcribe'; audio: Float32Array; language: string }
type TimedChunk = { text: string; timestamp: [number | null, number | null] }
const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope
const MODEL = 'onnx-community/whisper-base_timestamped'

ctx.onmessage = async (event: MessageEvent<Request>) => {
  const { audio, language } = event.data
  try {
    ctx.postMessage({ type: 'status', stage: 'model', message: 'Preparing Whisper Base', progress: 0 })
    const { pipeline, env, WhisperTextStreamer } = await import('@huggingface/transformers')
    env.allowLocalModels = false
    env.useBrowserCache = true
    env.useWasmCache = true

    let modelProgress = 0
    const progress_callback = (info: { status?: string; progress?: number }) => {
      if (info.status !== 'progress_total' || !Number.isFinite(info.progress)) return
      modelProgress = Math.max(modelProgress, Math.min(100, Math.max(0, info.progress ?? 0)))
      ctx.postMessage({ type: 'status', stage: 'model', message: 'Preparing Whisper Base', progress: modelProgress })
    }

    const transcriber = await pipeline('automatic-speech-recognition', MODEL, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback,
    })

    ctx.postMessage({ type: 'status', stage: 'inference', message: 'Transcribing audio locally', progress: 0 })
    let generatedTokens = 0
    const streamer = new WhisperTextStreamer(transcriber.tokenizer as ConstructorParameters<typeof WhisperTextStreamer>[0], {
      callback_function: () => undefined,
      token_callback_function: (tokens: bigint[]) => {
        generatedTokens += tokens.length
        if (generatedTokens % 8 < tokens.length) ctx.postMessage({ type: 'activity', generatedTokens })
      },
    })

    const result = await transcriber(audio, {
      return_timestamps: 'word',
      language: language || undefined,
      chunk_length_s: 30,
      stride_length_s: 5,
      streamer,
    }) as { chunks?: TimedChunk[] }

    const chunks = (result.chunks ?? []).filter((chunk) => chunk.text.trim())
    const audioDuration = audio.length / 16_000
    const hasValidTimestamp = (chunk: TimedChunk) => {
      const [start, end] = chunk.timestamp ?? []
      return start != null && end != null && Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start < audioDuration && end > start
    }

    const previousEnds: Array<number | null> = []
    let previousEnd: number | null = null
    for (const chunk of chunks) {
      previousEnds.push(previousEnd)
      if (hasValidTimestamp(chunk)) previousEnd = Math.min(chunk.timestamp[1]!, audioDuration)
    }
    const nextStarts: Array<number | null> = Array.from({ length: chunks.length }, () => null)
    let nextStart: number | null = null
    for (let index = chunks.length - 1; index >= 0; index--) {
      nextStarts[index] = nextStart
      if (hasValidTimestamp(chunks[index])) nextStart = chunks[index].timestamp[0]
    }

    const words: Array<{ id: string; text: string; start: number; end: number }> = []
    let repairedTimestamps = 0
    let skippedWords = 0
    let lastRepairedAt = Number.NaN

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]
      const [start, end] = chunk.timestamp ?? []
      if (hasValidTimestamp(chunk)) {
        words.push({ id: `w-${index}`, text: chunk.text.trim(), start: start!, end: Math.min(end!, audioDuration) })
        continue
      }

      const previousEnd = previousEnds[index]
      const nextStart = nextStarts[index]
      const canRepair = start != null && end != null && Number.isFinite(start) && Number.isFinite(end)
        && start >= 0 && end === start && start !== lastRepairedAt
        && previousEnd != null && nextStart != null && nextStart > previousEnd
        && nextStart - previousEnd <= 0.75

      if (canRepair) {
        words.push({ id: `w-${index}`, text: chunk.text.trim(), start: previousEnd, end: nextStart })
        lastRepairedAt = start
        repairedTimestamps++
      } else {
        skippedWords++
      }
    }

    words.sort((a, b) => a.start - b.start || a.end - b.end)
    if (!words.length) throw new Error('Whisper could not produce usable word timings for this audio. Try another supported audio file.')
    ctx.postMessage({
      type: 'complete',
      words,
      warning: skippedWords ? `${skippedWords} word${skippedWords === 1 ? ' did' : 's did'} not have reliable timing and ${skippedWords === 1 ? 'was' : 'were'} left out. You can review the transcript before export.` : '',
      repairedTimestamps,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : ''
    const message = /memory|allocation/i.test(detail)
      ? 'The browser ran out of memory. Try a shorter audio file and close other tabs before retrying.'
      : /fetch|network|download/i.test(detail)
        ? 'Whisper Base could not be downloaded. Check your connection and retry; the selected audio stays on this device.'
        : /wasm|backend|runtime/i.test(detail)
          ? 'This browser could not start the local speech runtime. Update the browser and try again; current Chromium, Firefox, and Safari versions work best.'
          : detail || 'Transcription could not be completed. Retry with the same audio or choose another supported file.'
    ctx.postMessage({ type: 'error', message })
  }
}

export {}
