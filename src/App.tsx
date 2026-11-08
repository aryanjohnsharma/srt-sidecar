import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { getCalApi } from '@calcom/embed-react'
import { AudioLines, ArrowDownToLine, ArrowLeft, Check, ChevronDown, CircleHelp, FileAudio2, FileText, Gauge, Headphones, LockKeyhole, Pause, Play, Plus, RotateCcw, Settings2, ShieldCheck, Sparkles, Upload, Volume2, X } from './components/pika-ui-icons'
import Dither from './components/Dither'
import { MoonIcon, SquareInstagramIcon, SunsamaIcon, XTwitterIcon } from './components/brand-icons'
import { buildCues, formatTimestamp, serializeSrt, validateCues, type Settings, type Word } from './lib/srt'
import { clearProjects, deleteProject, listProjects, saveProject, type SavedProject } from './lib/projects'
import { MetalButton } from './components/metal-button'
import './project-ui.css'
import './metal-button.css'
import './motion.css'
import './marquee.css'
import './handmade.css'

type Phase = 'upload' | 'transcribing' | 'review'
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const demoWords: Word[] = [
  ['The', .38, .58], ['best', .58, .91], ['ideas', .91, 1.28], ['don’t', 1.28, 1.58], ['wait', 1.58, 1.89], ['for', 1.89, 2.03], ['a', 2.03, 2.11], ['perfect', 2.11, 2.48], ['moment.', 2.48, 3.02],
  ['They', 3.46, 3.73], ['start', 3.73, 4.08], ['with', 4.08, 4.3], ['one', 4.3, 4.57], ['small', 4.57, 4.92], ['step.', 4.92, 5.47],
  ['Make', 5.91, 6.26], ['something', 6.26, 6.8], ['today.', 6.8, 7.22],
].map(([text, start, end], i) => ({ id: `demo-${i}`, text: String(text), start: Number(start), end: Number(end) }))
const marqueeItems = [
  { text: 'CUSTOM WORDS PER CUE', Icon: AudioLines },
  { text: 'TIMED TO YOUR AUDIO', Icon: Sparkles },
  { text: 'EDIT EVERY WORD', Icon: FileText },
  { text: 'PRIVATE ON YOUR DEVICE', Icon: LockKeyhole },
  { text: 'READY FOR YOUR EDIT', Icon: ShieldCheck },
]

function App({ onReady }: { onReady?: () => void }) {
  const [phase, setPhase] = useState<Phase>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [words, setWords] = useState<Word[]>([])
  const [settings, setSettings] = useState<Settings>({ maxWords: 1, maxDuration: null, maxChars: null, sentenceAware: false, preservePauses: true })
  const [advanced, setAdvanced] = useState(false)
  const [language, setLanguage] = useState('')
  const [status, setStatus] = useState('Getting things ready')
  const [progress, setProgress] = useState(0)
  const [progressStage, setProgressStage] = useState<'model' | 'inference'>('model')
  const [hasModelProgress, setHasModelProgress] = useState(false)
  const [activityCount, setActivityCount] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [transcriptionNotice, setTranscriptionNotice] = useState('')
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeCue, setActiveCue] = useState(0)
  const [selectedCueIndex, setSelectedCueIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exported, setExported] = useState(false)
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [currentProjectId, setCurrentProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [storageMessage, setStorageMessage] = useState('')
  const [audioMissing, setAudioMissing] = useState(false)
  const [reselectAudio, setReselectAudio] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)
  const [modelCacheStatus, setModelCacheStatus] = useState('Checking')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('srt-sidecar-theme') === 'dark' ? 'dark' : 'light')
  const audioRef = useRef<HTMLAudioElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const jobSequenceRef = useRef(0)
  const transcriptionStartedAtRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const projectsRef = useRef(projects)
  const cues = useMemo(() => buildCues(words, settings), [words, settings])
  const cueIssues = useMemo(() => validateCues(cues, settings), [cues, settings])
  const audioUrl = useMemo(() => file ? URL.createObjectURL(file) : '', [file])
  const reducedMotion = false

  const switchTheme = (event: MouseEvent<HTMLButtonElement>) => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    const viewDocument = document as Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } }
    if (reducedMotion) {
      setTheme(nextTheme)
      return
    }
    if (!viewDocument.startViewTransition) {
      document.documentElement.classList.add('theme-switching')
      setTheme(nextTheme)
      window.setTimeout(() => document.documentElement.classList.remove('theme-switching'), 600)
      return
    }
    document.documentElement.dataset.themeTransitioning = 'true'
    document.documentElement.style.setProperty('--theme-switch-x', `${event.clientX}px`)
    document.documentElement.style.setProperty('--theme-switch-y', `${event.clientY}px`)
    const cleanup = () => {
      delete document.documentElement.dataset.themeTransitioning
      document.documentElement.style.removeProperty('--theme-switch-x')
      document.documentElement.style.removeProperty('--theme-switch-y')
    }
    try {
      const transition = viewDocument.startViewTransition(() => setTheme(nextTheme))
      void transition.finished.then(cleanup, cleanup)
    } catch {
      cleanup()
      setTheme(nextTheme)
    }
  }

  const transitionPhase = (next: Phase) => {
    const viewDocument = document as Document & { startViewTransition?: (update: () => void) => unknown }
    if (reducedMotion || !viewDocument.startViewTransition) {
      setPhase(next)
      return
    }
    viewDocument.startViewTransition(() => setPhase(next))
  }

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])
  useEffect(() => () => workerRef.current?.terminate(), [])
  useEffect(() => {
    if (phase !== 'transcribing' || !transcriptionStartedAtRef.current) return
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - transcriptionStartedAtRef.current) / 1000))
    updateElapsed()
    const interval = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(interval)
  }, [phase])
  useEffect(() => { projectsRef.current = projects }, [projects])
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const cal = await getCalApi({ namespace: 'srt-sidecar-chat' })
      if (!cancelled) cal('ui', { hideEventTypeDetails: false, layout: 'month_view' })
    })()
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('srt-sidecar-theme', theme)
  }, [theme])
  useEffect(() => { onReady?.() }, [onReady])
  useEffect(() => {
    void listProjects().then(setProjects).catch(() => setStorageMessage('Local project history is unavailable in this browser. You can still export SRT files.'))
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt) }
    window.addEventListener('beforeinstallprompt', onInstall)
    if ('caches' in window) void caches.open('transformers-cache').then((cache) => cache.keys()).then((keys) => setModelCacheStatus(keys.length ? 'Cached' : 'Not downloaded')).catch(() => setModelCacheStatus('Unavailable'))
    else setModelCacheStatus('Unavailable')
    return () => { window.removeEventListener('beforeinstallprompt', onInstall) }
  }, [])
  useEffect(() => {
    if (phase !== 'review' || !words.length || (!file && !currentProjectId)) return
    const id = currentProjectId || (crypto.randomUUID?.() ?? `project-${Date.now()}`)
    const name = projectName || (file?.name.replace(/\.[^.]+$/, '') ?? 'Untitled project')
    const project: SavedProject = { id, name, sourceName: file?.name ?? projectsRef.current.find((item) => item.id === id)?.sourceName ?? '', duration, updatedAt: Date.now(), words, settings }
    const timer = window.setTimeout(() => {
      void saveProject(project).then(() => {
        setCurrentProjectId(id)
        setProjectName(name)
        setStorageMessage('Saved on this device. Browser storage can be cleared or evicted.')
        return listProjects().then(setProjects)
      }).catch(() => setStorageMessage('This project could not be saved locally. Export your SRT to keep a copy.'))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [phase, words, settings, file, duration, currentProjectId, projectName])

  const acceptFile = (next: File | undefined) => {
    if (!next) return
    if (next.size > 200 * 1024 * 1024) {
      setError('This file is over 200 MB. Choose a shorter or smaller audio export to keep browser memory use manageable.')
      return
    }
    if (!next.type.startsWith('audio/') && !/\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i.test(next.name)) {
      setError('Choose an audio file such as WAV, MP3, M4A or AAC.')
      return
    }
    setError('')
    setTranscriptionNotice('')
    setFile(next)
    setWords([])
    setDuration(0)
    setCurrentTime(0)
    setPlaying(false)
    setCurrentProjectId('')
    setProjectName(next.name.replace(/\.[^.]+$/, ''))
    setAudioMissing(false)
    setReselectAudio(false)
    transitionPhase('upload')
  }

  const handleFileChange = (next: File | undefined) => {
    if (!next) return
    if (reselectAudio) {
      if (next.name !== projectsRef.current.find((project) => project.id === currentProjectId)?.sourceName) {
        setError('Choose the original audio file to reconnect playback for this project. Your transcript is unchanged.')
        return
      }
      setFile(next)
      setAudioMissing(false)
      setReselectAudio(false)
      setError('')
      return
    }
    acceptFile(next)
  }

  const openProject = (project: SavedProject) => {
    workerRef.current?.terminate()
    workerRef.current = null
    setFile(null)
    setWords(project.words)
    const savedSettings = project.settings as Partial<Settings>
    setSettings({ maxWords: savedSettings.maxWords ?? 1, maxDuration: savedSettings.maxDuration ?? null, maxChars: savedSettings.maxChars ?? null, sentenceAware: savedSettings.sentenceAware ?? false, preservePauses: savedSettings.preservePauses ?? true })
    setDuration(project.duration)
    setCurrentProjectId(project.id)
    setProjectName(project.name)
    setAudioMissing(Boolean(project.sourceName))
    setError('')
    setTranscriptionNotice('')
    transitionPhase('review')
  }

  const renameProject = async () => {
    const nextName = window.prompt('Name this project', projectName)
    if (!nextName?.trim()) return
    setProjectName(nextName.trim())
    if (currentProjectId) {
      const existing = projects.find((project) => project.id === currentProjectId)
      if (existing) {
        const renamed = { ...existing, name: nextName.trim(), updatedAt: Date.now() }
        await saveProject(renamed).catch(() => setStorageMessage('The new project name could not be saved.'))
        void listProjects().then(setProjects)
      }
    }
  }

  const renameSavedProject = async (project: SavedProject) => {
    const nextName = window.prompt('Name this project', project.name)?.trim()
    if (!nextName) return
    await saveProject({ ...project, name: nextName, updatedAt: Date.now() }).catch(() => setStorageMessage('The new project name could not be saved.'))
    if (currentProjectId === project.id) setProjectName(nextName)
    void listProjects().then(setProjects)
  }

  const removeProject = async (project: SavedProject) => {
    if (!window.confirm(`Delete “${project.name}” from this device? This cannot be undone.`)) return
    try {
      await deleteProject(project.id)
      setProjects((current) => current.filter((item) => item.id !== project.id))
      if (currentProjectId === project.id) { setCurrentProjectId(''); setFile(null); transitionPhase('upload'); setWords([]) }
    } catch {
      setStorageMessage('The project could not be deleted from local storage.')
    }
  }

  const clearModelCache = async () => {
    if (!('caches' in window)) { setStorageMessage('This browser does not expose model cache controls.'); return }
    if (!window.confirm('Clear the downloaded Whisper model from this browser? Saved projects will stay on this device.')) return
    const cleared = await caches.delete('transformers-cache')
    setModelCacheStatus('Not downloaded')
    setStorageMessage(cleared ? 'Whisper model cache cleared. Saved projects were kept.' : 'No Whisper model cache was found. Saved projects were kept.')
  }

  const clearProjectHistory = async () => {
    if (!window.confirm('Delete all saved project transcripts from this device? The downloaded Whisper model will stay cached.')) return
    try {
      await clearProjects()
      setProjects([])
      setCurrentProjectId('')
      setStorageMessage('Saved project history cleared. The Whisper model cache was kept.')
    } catch {
      setStorageMessage('Saved projects could not be cleared.')
    }
  }

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const transcribe = async () => {
    if (!file) return
    const jobId = ++jobSequenceRef.current
    setError('')
    transitionPhase('transcribing')
    setStatus('Preparing audio')
    setProgress(0)
    setProgressStage('model')
    setHasModelProgress(false)
    setActivityCount(0)
    setElapsedSeconds(0)
    setTranscriptionNotice('')
    transcriptionStartedAtRef.current = Date.now()
    let audioContext: AudioContext | null = null
    try {
      const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextConstructor) throw new Error('This browser cannot decode audio locally. Try a current version of Chrome or Edge, or export WAV/MP3 from your editor.')
      audioContext = new AudioContextConstructor()
      const buffer = await audioContext.decodeAudioData(await file.arrayBuffer())
      if (jobSequenceRef.current !== jobId) { await audioContext.close(); return }
      await audioContext.close()
      audioContext = null
      if (buffer.duration > 30 * 60) throw new Error('This audio is longer than the current 30-minute browser limit. Export a shorter audio section and try again.')
      setDuration(buffer.duration)
      const targetRate = 16_000
      const length = Math.ceil(buffer.duration * targetRate)
      const mono = new Float32Array(length)
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
      for (let i = 0; i < length; i++) {
        const sourcePos = i * buffer.sampleRate / targetRate
        const left = Math.floor(sourcePos)
        const fraction = sourcePos - left
        let sample = 0
        for (const channel of channels) {
          const a = channel[left] ?? 0
          const b = channel[Math.min(left + 1, channel.length - 1)] ?? a
          sample += a + (b - a) * fraction
        }
        mono[i] = sample / channels.length
      }
      const worker = new Worker(new URL('./workers/transcription.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      worker.onerror = () => {
        if (jobSequenceRef.current !== jobId) return
        setError('The transcription worker stopped unexpectedly. Your selected audio is still here; retry or export a shorter section.')
        transitionPhase('upload')
        worker.terminate()
        workerRef.current = null
      }
      worker.onmessage = (event: MessageEvent) => {
        if (jobSequenceRef.current !== jobId) return
        const data = event.data
        if (data.type === 'status') {
          setStatus(data.message)
          if (data.stage === 'inference') setProgressStage('inference')
          if (data.stage === 'model' && Number.isFinite(data.progress)) {
            setHasModelProgress(true)
            setProgress((current) => Math.max(current, Math.min(100, Math.max(0, data.progress))))
            setModelCacheStatus(data.progress >= 100 ? 'Preparing' : 'Downloading')
          }
        }
        if (data.type === 'activity') setActivityCount(Number(data.generatedTokens) || 0)
        if (data.type === 'complete') { setWords(data.words as Word[]); setTranscriptionNotice(typeof data.warning === 'string' ? data.warning : ''); transitionPhase('review'); setModelCacheStatus('Cached'); worker.terminate(); workerRef.current = null }
        if (data.type === 'error') { setError(data.message); setModelCacheStatus('Error'); transitionPhase('upload'); worker.terminate(); workerRef.current = null }
      }
      worker.postMessage({ type: 'transcribe', audio: mono, language }, [mono.buffer])
    } catch (err) {
      if (audioContext && audioContext.state !== 'closed') await audioContext.close().catch(() => undefined)
      if (jobSequenceRef.current !== jobId) return
      const detail = err instanceof Error ? err.message : ''
      setError(/decode|audio data|unsupported|corrupt/i.test(detail)
        ? 'This browser could not decode the selected audio. Re-export it as WAV or MP3 from your editor and try again.'
        : /memory|allocation/i.test(detail)
          ? 'Your browser ran out of memory while preparing this audio. Try a shorter section and close other tabs.'
          : detail || 'We couldn’t prepare that audio file. Try another supported format.')
      transitionPhase('upload')
    }
  }

  const useSample = () => {
    setFile(null)
    setDuration(7.3)
    setWords(demoWords)
    setCurrentProjectId('')
    setProjectName('')
    setAudioMissing(false)
    transitionPhase('review')
    setError('')
  }

  const seek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); void audioRef.current.play(); setPlaying(true) }
  }

  const exportSrt = () => {
    const content = serializeSrt(cues)
    if (!content) return
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
      const sourceName = file?.name ?? projectsRef.current.find((project) => project.id === currentProjectId)?.sourceName
      const baseName = (sourceName?.replace(/\.[^.]+$/, '') || projectName || 'sidecar-subtitles').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'sidecar-subtitles'
      link.download = `${baseName}.srt`
    link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setExported(true)
    window.setTimeout(() => setExported(false), 2800)
  }

  const pick = () => inputRef.current?.click()
  const setNumber = (key: 'maxWords' | 'maxDuration' | 'maxChars', raw: string) => setSettings((previous) => {
    if (raw === '') return { ...previous, [key]: key === 'maxWords' ? 1 : null }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return previous
    const value = key === 'maxWords' || key === 'maxChars' ? Math.floor(parsed) : parsed
    return { ...previous, [key]: key === 'maxWords' ? Math.min(20, Math.max(1, value)) : Math.max(key === 'maxChars' ? 1 : 0.1, value) }
  })

  const adjustCueTime = (cueIndex: number, edge: 'start' | 'end', raw: string) => {
    if (raw === '') return
    const value = Number(raw)
    const cue = cues[cueIndex]
    if (!cue || !Number.isFinite(value) || value < 0) return
    const wordId = edge === 'start'
      ? words.find((word) => word.start === cue.start)?.id
      : [...words].reverse().find((word) => word.end === cue.end)?.id
    if (!wordId) return
    setWords((current) => current.map((word) => word.id === wordId ? { ...word, [edge]: value } : word))
  }

  const mergeNextWord = (id: string) => setWords((current) => {
    const index = current.findIndex((word) => word.id === id)
    if (index < 0 || index >= current.length - 1) return current
    const first = current[index]
    const next = current[index + 1]
    const nextText = next.text.trim()
    const needsSpace = !/^[,.;:!?%)}\]”’]/u.test(nextText)
    const merged = { ...first, text: `${first.text.trim()}${needsSpace ? ' ' : ''}${nextText}`, end: next.end }
    return current.filter((_, itemIndex) => itemIndex !== index + 1).map((word) => word.id === id ? merged : word)
  })

  useEffect(() => {
    const cueIndex = cues.findIndex((cue) => currentTime >= cue.start && currentTime <= cue.end)
    setActiveCue(cueIndex)
  }, [currentTime, cues])
  useEffect(() => {
    if (selectedCueIndex >= cues.length) setSelectedCueIndex(Math.max(0, cues.length - 1))
  }, [cues.length, selectedCueIndex])

  const onDrop = useCallback((event: DragEvent) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]) }, [])

  return (
    <div className={`app-shell${phase === 'review' ? ' has-floating-export' : ''}`} data-theme={theme}>
      <div className="ambient-layer" aria-hidden="true"><Dither waveSpeed={0.4} waveFrequency={1.6} waveAmplitude={0.3} waveColor={[0.56, 0.64, 0.59]} backgroundColor="transparent" colorNum={3} pixelSize={3} disableAnimation={reducedMotion} enableMouseInteraction={false} ditherMode="bayer4" scale={1.1} contrast={0.8} brightness={0.02} mouseEffect="ripple" mouseStrength={0.3} trail={0.25} clickRipple={false} /></div>
      <header className="topbar">
        <a href="#home" className="brand" aria-label="SRT Sidecar home" onClick={(event) => { event.preventDefault(); transitionPhase('upload'); setWords([]); setFile(null) }}>
          <span className="brand-mark"><AudioLines size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">srt<span>sidecar</span></span>
        </a>
        <div className="topbar-actions">
          <a className="topbar-author" href="https://aryanjohnsharma.github.io/" target="_blank" rel="noreferrer noopener">by @aryanjohnsharma</a>
          {installPrompt ? <MetalButton variant="steel" wrapperClassName="header-metal-wrap" className="metal-button-cta header-metal-button" type="button" onClick={() => void installApp()}>Install app <ArrowDownToLine size={14} /></MetalButton> : <a className="topbar-link" href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }) }}><CircleHelp size={15} /> How it works</a>}
          <MetalButton variant="steel" wrapperClassName="header-metal-wrap" className="metal-button-cta header-metal-button" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} aria-pressed={theme === 'dark'} onClick={switchTheme}><span aria-hidden="true">{theme === 'light' ? <MoonIcon /> : <SunsamaIcon />}</span><span>{theme === 'light' ? 'Dark' : 'Light'}</span></MetalButton>
        </div>
      </header>

      <main className="main-content">
        {phase === 'upload' && <>
          <section className="hero">
            <h1>Your edit is done.<br /><span>Let’s give it a voice.</span></h1>
            <p className="hero-copy">Turn your audio into word-timed subtitles, right here on your device.<br className="desktop-break" /> Ready for whichever editor comes next.</p>
          </section>
          <section className="workspace upload-workspace" aria-label="Start a subtitle project">
            <div className="workspace-heading"><div><div className="section-kicker">01 <span>·</span> START WITH AUDIO</div><h2>Bring your audio</h2><p>Choose a voice track from your finished edit.</p></div><span className="step-pill">STEP 1 OF 3</span></div>
            <input ref={inputRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac" className="sr-only" onChange={(event) => { handleFileChange(event.target.files?.[0]); event.currentTarget.value = '' }} />
            {!file ? <button className={`dropzone ${dragging ? 'is-dragging' : ''}`} onClick={pick} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop} aria-label="Choose or drop an audio file">
              <span className="upload-icon"><Upload size={22} /></span><span className="drop-title">Drop your audio here, or <span>browse files</span></span><span className="drop-meta">WAV, MP3, M4A, AAC <i /> UP TO 200 MB</span>
            </button> : <div className="selected-file"><span className="file-icon"><FileAudio2 size={20} /></span><div className="file-info"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(1)} MB{duration ? ` · ${formatDuration(duration)}` : ''} · stays on this device</span></div><button className="icon-button" aria-label="Remove selected audio" onClick={() => { setFile(null); setDuration(0) }}><X size={17} /></button></div>}
            {file && file.size > 50 * 1024 * 1024 && <div className="large-file-note" role="status">Large audio can use substantial browser memory. Close other tabs or choose a shorter export if your device has limited memory.</div>}
            {error && <div className="error-note" role="alert">{error}</div>}
            <div className="setup-row">
              <label className="language-select"><span>TRANSCRIPTION LANGUAGE</span><span className="select-wrap"><select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="">Auto-detect</option><option value="english">English</option><option value="hindi">Hindi</option><option value="spanish">Spanish</option><option value="french">French</option><option value="german">German</option><option value="japanese">Japanese</option><option value="portuguese">Portuguese</option></select><ChevronDown size={15} /></span></label>
              <div className="setup-divider" />
              <div className="model-note"><span className="model-dot" /><div><strong>Whisper Base <small className="model-cache-status">{modelCacheStatus}</small></strong><span>Runs on your device · {modelCacheStatus === 'Cached' ? 'model cached when browser storage allows' : 'downloads on first use'}</span></div></div>
            </div>
            <MetalButton variant="steel" wrapperClassName="metal-button-full" className="metal-button-cta start-button" disabled={!file} onClick={() => void transcribe()}>Transcribe audio <ArrowDownToLine size={16} className="button-arrow" /></MetalButton>
            <div className="upload-footnote"><LockKeyhole size={13} /> Your audio stays in your browser. Nothing is uploaded to a Sidecar server.</div>
          </section>
          <section className="value-row" id="how-it-works">
            <div className="value-item"><strong>TRANSCRIBE LOCALLY</strong><span>Your audio stays in this browser.</span></div>
            <div className="value-item"><strong>EDIT WORD BY WORD</strong><span>Check timing and wording before export.</span></div>
            <div className="value-item"><strong>EXPORT FOR YOUR EDITOR</strong><span>Download a standard SRT subtitle file.</span></div>
          </section>
          <button className="sample-link" onClick={useSample}><Sparkles size={14} /> Take a quick look around <span>Try the sample project</span> <ArrowDownToLine size={13} className="sample-arrow" /></button>
          <section className="recent-projects" aria-label="Recent local projects">
            <div className="recent-heading"><div><span className="section-kicker">YOUR WORKSPACE</span><h2>Recent projects</h2></div><div className="recent-tools"><button className="text-button" onClick={() => void clearProjectHistory()}>Clear project history</button><button className="text-button" onClick={() => void clearModelCache()}>Clear Whisper model cache</button></div></div>
            <p className="storage-note">Projects save in this browser only. Browser storage can be cleared or evicted; audio files are never saved here.</p>
            {projects.slice(0, 5).map((project) => <div className="recent-project" key={project.id}><button className="recent-open" onClick={() => openProject(project)}><FileText size={16} /><span><strong>{project.name}</strong><small>{project.words.length} words · {new Date(project.updatedAt).toLocaleDateString()}</small></span></button><button className="recent-action" onClick={() => void renameSavedProject(project)}>Rename</button><button className="icon-button" aria-label={`Delete ${project.name}`} onClick={() => void removeProject(project)}><X size={15} /></button></div>)}
            {!projects.length && <p className="empty-projects">No saved projects on this device yet.</p>}
            <p className="storage-note">Offline app access begins after the first visit. Offline transcription also requires the Whisper model cache ({modelCacheStatus.toLowerCase()}).</p>
            {storageMessage && <p className="storage-note" role="status">{storageMessage}</p>}
          </section>
        </>}

        {phase === 'transcribing' && <section className="workspace loading-workspace"><div className="section-kicker">02 <span>·</span> WORKING ON YOUR AUDIO</div><div className="loader-orbit"><AudioLines size={28} /></div><h2>{status}</h2><p>{progressStage === 'model' ? hasModelProgress ? `${Math.round(progress)}% of Whisper Base files loaded · cached by your browser when storage allows` : 'Preparing the local speech engine and checking for cached model files.' : `${activityCount ? 'Whisper is actively processing your audio' : 'Starting local transcription'} · ${formatDuration(elapsedSeconds)} elapsed. Slower devices may take a few minutes.`}</p><div className={`progress-track${progressStage === 'inference' || !hasModelProgress ? ' is-indeterminate' : ''}`} role="progressbar" aria-label={progressStage === 'model' ? 'Loading Whisper Base model files' : 'Transcribing audio locally'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressStage === 'model' && hasModelProgress ? Math.round(progress) : undefined} aria-valuetext={progressStage === 'model' && hasModelProgress ? `${Math.round(progress)} percent of model files loaded` : progressStage === 'inference' ? 'Local transcription is in progress' : 'Preparing the local speech engine'}><span style={progressStage === 'model' && hasModelProgress ? { width: `${Math.max(progress, 2)}%` } : undefined} /></div><span className="loading-caption"><LockKeyhole size={13} /> Your audio never leaves this device</span><button className="text-button" onClick={() => { jobSequenceRef.current += 1; workerRef.current?.terminate(); workerRef.current = null; transitionPhase('upload') }}>Cancel transcription</button></section>}

        {phase === 'review' && <>
          <div className="editor-heading"><button className="back-link" onClick={() => { transitionPhase('upload'); setError('') }}><ArrowLeft size={15} /> New audio</button><div className="editor-title-row"><div><div className="section-kicker">02 <span>·</span> REVIEW & SHAPE</div><h1>Your words.<br /><span>Your rhythm.</span></h1>{currentProjectId && <button className="project-rename" onClick={() => void renameProject()}>{projectName || 'Untitled project'} · rename</button>}</div><span className="ready-pill"><Check size={13} /> READY TO EXPORT</span></div><p className="editor-intro">Tap any word to check it against your audio. Shape the rhythm, then send your SRT to the edit.</p>{transcriptionNotice && <p className="transcript-timing-note" role="status">{transcriptionNotice}</p>}</div>
          <div className="editor-layout">
            <section className="editor-main">
              <div className="audio-card">
                {file && <audio ref={audioRef} src={audioUrl} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onDurationChange={(e) => setDuration(e.currentTarget.duration)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />}
                <button className="play-button" aria-label={playing ? 'Pause audio' : 'Play audio'} onClick={() => { if (!file) return; if (playing) audioRef.current?.pause(); else void audioRef.current?.play() }} disabled={!file}><span key={playing ? 'pause' : 'play'} className="icon-swap">{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</span></button>
                <div className="audio-info"><div className="audio-file-name"><strong>{file?.name ?? 'A little inspiration.wav'}</strong><span>{file ? 'YOUR AUDIO' : 'SAMPLE PROJECT'}</span></div><div className="waveform" role="slider" aria-label="Seek audio" aria-valuemin={0} aria-valuemax={duration || 7.3} aria-valuenow={currentTime} tabIndex={file ? 0 : -1} onKeyDown={(event) => { if (!duration) return; if (event.key === 'ArrowLeft') { event.preventDefault(); seek(Math.max(0, currentTime - 1)) } if (event.key === 'ArrowRight') { event.preventDefault(); seek(Math.min(duration, currentTime + 1)) } if (event.key === 'Home') { event.preventDefault(); seek(0) } if (event.key === 'End') { event.preventDefault(); seek(duration) } }} onClick={(e) => { if (duration && audioRef.current) { const rect = e.currentTarget.getBoundingClientRect(); seek((e.clientX - rect.left) / rect.width * duration) } }}><div className="wave-progress" style={{ width: `${duration ? currentTime / duration * 100 : currentTime / 7.3 * 100}%` }} />{Array.from({ length: 66 }, (_, i) => <i key={i} style={{ height: `${18 + Math.abs(Math.sin(i * 8.12) * Math.cos(i * .31)) * 71}%` }} />)}</div><div className="audio-time"><span>{formatDuration(currentTime)}</span><span>{formatDuration(duration || 7.3)}</span></div></div>
                <Volume2 className="volume-icon" size={16} />
              </div>
              {audioMissing && <div className="audio-missing" role="status"><span>Transcript restored. Choose the original audio file to enable playback.</span><button className="small-tool" onClick={() => { setReselectAudio(true); inputRef.current?.click() }}>Reconnect audio</button><input ref={inputRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac" className="sr-only" onChange={(event) => { handleFileChange(event.target.files?.[0]); event.currentTarget.value = '' }} /></div>}
              <div className="transcript-toolbar"><div><h3>Transcript</h3><span>{words.length} WORDS <i /> CLICK A WORD TO SEEK</span></div><button className="small-tool" onClick={() => { const end = words.at(-1)?.end ?? 0; setWords((current) => [...current, { id: `w-${Date.now()}`, text: 'word', start: end, end: end + .3 }]); setSelectedCueIndex(cues.length) }}><Plus size={14} /> Add word</button></div>
              <div className="transcript-card"><div className="transcript-line" aria-label="Editable transcript">{words.map((word, index) => <span key={word.id} className={`word-chip ${currentTime >= word.start && currentTime <= word.end ? 'word-active' : ''}`}><button className="word-seek" onClick={() => seek(word.start)} title={`${formatTimestamp(word.start)} · click to play`}>{word.text}</button><button className="word-edit" aria-label={`Edit text for ${word.text}`} onClick={() => { const nextText = window.prompt('Edit this timed word', word.text); if (nextText === null) return; if (/\s/.test(nextText.trim())) { setError('Keep one timed word in each token. Add a token separately, then adjust its timing before export.'); return } setError(''); setWords((current) => current.map((item) => item.id === word.id ? { ...item, text: nextText } : item)) }}>Edit</button>{index < words.length - 1 && <button className="word-edit" aria-label={`Merge ${word.text} with the next word`} onClick={() => mergeNextWord(word.id)}>Merge</button>}</span>)}</div><div className="transcript-note"><span className="tiny-dot" /> Select a word to play, edit its text, or merge it with the next word. New words start after the last word; adjust timing before export.</div></div>
              <div className="cue-toolbar"><div><h3>Subtitle rhythm</h3><span>Preview updates as you shape it.</span></div><span className="cue-count"><span>{cues.length}</span> CUES</span></div>
              <div className="cue-list">{cues.slice(0, 7).map((cue, i) => <button key={`${cue.index}-${cue.start}`} className={`cue-row ${activeCue === i ? 'cue-active' : ''}`} onClick={() => { setSelectedCueIndex(i); seek(cue.start) }}><span className="cue-index">{String(cue.index).padStart(2, '0')}</span><span className="cue-timing">{formatTimestamp(cue.start).slice(3)} <i>→</i> {formatTimestamp(cue.end).slice(3)}</span><span className="cue-text">{cue.text}</span><Play size={13} className="cue-play" /></button>)}{cues.length > 7 && <div className="more-cues">+ {cues.length - 7} more cues in your export</div>}{!cues.length && <div className="more-cues">Add a word to start previewing cues.</div>}</div>
              {cues[selectedCueIndex] && <div className="timing-editor"><strong>Adjust cue {selectedCueIndex + 1} timing</strong><label>Start <span><input type="number" min="0" step="0.001" aria-label="Selected cue start time in seconds" value={cues[selectedCueIndex].start.toFixed(3)} onChange={(event) => adjustCueTime(selectedCueIndex, 'start', event.target.value)} /> sec</span></label><label>End <span><input type="number" min="0" step="0.001" aria-label="Selected cue end time in seconds" value={cues[selectedCueIndex].end.toFixed(3)} onChange={(event) => adjustCueTime(selectedCueIndex, 'end', event.target.value)} /> sec</span></label><small>Changes the first and last word in this cue. Review adjacent cues if they overlap.</small></div>}
              {exported && <div className="success-note" role="status"><Check size={15} /> Your SRT is downloaded and ready to import.</div>}
              {cueIssues.length > 0 && <div className={cueIssues.some((issue) => issue.severity === 'error') ? 'error-note' : 'validation-note'} role="status">{cueIssues.slice(0, 2).map((issue) => issue.message).join(' ')}{cueIssues.length > 2 ? ` + ${cueIssues.length - 2} more checks.` : ''}</div>}
              {error && <div className="error-note" role="alert">{error}</div>}
            </section>
            <aside className="settings-panel">
              <div className="settings-top"><span className="settings-icon"><Settings2 size={16} /></span><div><strong>Make it yours</strong><span>SHAPE YOUR CUES</span></div></div>
              <label className="setting-control"><span>Words per cue <span className="help-dot" title="The maximum number of words grouped into one subtitle cue.">?</span></span><span className="number-stepper"><button aria-label="Fewer words per cue" onClick={() => setSettings((s) => ({ ...s, maxWords: Math.max(1, s.maxWords - 1) }))}>−</button><input aria-label="Words per cue" type="number" min={1} max={20} value={settings.maxWords} onChange={(e) => setNumber('maxWords', e.target.value)} /><button aria-label="More words per cue" onClick={() => setSettings((s) => ({ ...s, maxWords: Math.min(20, s.maxWords + 1) }))}>+</button></span></label>
              <p className="setting-hint">1 = one word at a time. Up to 20 = short phrases.</p>
              <button className="advanced-toggle" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}><span><Gauge size={15} /> Fine-tune your timing</span><ChevronDown size={15} className={advanced ? 'rotate' : ''} /></button>
              {advanced && <div className="advanced-controls"><label>Max cue duration <span><input aria-label="Max cue duration in seconds" type="number" min="0.1" step="0.1" placeholder="No limit" value={settings.maxDuration ?? ''} onChange={(e) => setNumber('maxDuration', e.target.value)} /> sec</span></label><label>Max characters <input aria-label="Maximum characters per cue" type="number" min="1" placeholder="No limit" value={settings.maxChars ?? ''} onChange={(e) => setNumber('maxChars', e.target.value)} /></label><label className="toggle-label">Break at sentence ends <input type="checkbox" checked={settings.sentenceAware} onChange={(e) => setSettings((s) => ({ ...s, sentenceAware: e.target.checked }))} /><span className="toggle-ui" /></label><label className="toggle-label">Preserve pauses over 0.6 sec <input type="checkbox" checked={settings.preservePauses} onChange={(e) => setSettings((s) => ({ ...s, preservePauses: e.target.checked }))} /><span className="toggle-ui" /></label><button className="reset-button" onClick={() => setSettings({ maxWords: 1, maxDuration: null, maxChars: null, sentenceAware: false, preservePauses: true })}><RotateCcw size={12} /> Reset settings</button></div>}
              <div className="settings-example"><span className="example-label">A LITTLE PREVIEW</span><div className="example-cue">{cues[0]?.text || 'Your words'}<small>{cues[0] ? `${formatTimestamp(cues[0].start).slice(3)} → ${formatTimestamp(cues[0].end).slice(3)}` : '00:00,000 → 00:00,000'}</small></div></div>
              <div className="settings-bottom"><div><span className="bottom-count">{cues.length}</span><span> cues · UTF-8 SRT</span></div><MetalButton variant="steel" wrapperClassName="metal-button-full" className="metal-button-cta export-button" onClick={exportSrt} disabled={!cues.length || cueIssues.some((issue) => issue.severity === 'error')}><ArrowDownToLine size={15} /> Export SRT</MetalButton><div className="export-footnote"><LockKeyhole size={12} /> Created locally in your browser</div></div>
            </aside>
          </div>
          <footer className="editor-footer"><span><Headphones size={14} /> Model-estimated timing. Give your cues a listen before export.</span><button onClick={useSample}><Sparkles size={13} /> Preview sample</button></footer>
          <div className="floating-export" style={{ position: 'fixed', left: '50%', bottom: 'calc(16px + env(safe-area-inset-bottom))', transform: 'translateX(-50%)', zIndex: 25 }}>
            <div className="floating-export-inner"><span><strong>{cues.length}</strong> cues <i /> UTF-8 SRT</span><MetalButton variant="steel" wrapperClassName="metal-button-floating" className="metal-button-cta floating-export-button" onClick={exportSrt} disabled={!cues.length}><ArrowDownToLine size={15} /> Export SRT</MetalButton></div>
          </div>
        </>}
      </main>
      <section className="benefit-marquee" aria-label="How SRT Sidecar helps">
        <p className="sr-only">Word-timed subtitles, editable one word at a time, private on your device, and ready for your video editor.</p>
        <div className="marquee-track" aria-hidden="true">
          {[0, 1].map((copy) => <div className="marquee-group" key={copy}>
            {marqueeItems.map(({ text, Icon }) => <span className="marquee-item" key={text}><Icon size={16} strokeWidth={1.7} /><span>{text}</span><i /></span>)}
          </div>)}
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-meta"><span>© 2026 SRT SIDECAR</span><span className="footer-credit">SHIPPED BY <a href="https://aryanjohnsharma.github.io/" target="_blank" rel="noreferrer noopener">@aryanjohnsharma</a></span></div>
        <div className="footer-actions">
          <a className="footer-social" href="https://x.com/aryanjohnsharma" target="_blank" rel="noreferrer noopener" aria-label="Follow Aryan on X"><span className="footer-social-mark" aria-hidden="true"><XTwitterIcon /></span></a>
          <a className="footer-social" href="https://www.instagram.com/aryanjohnsharma/" target="_blank" rel="noreferrer noopener" aria-label="Follow Aryan on Instagram"><span className="footer-social-mark" aria-hidden="true"><SquareInstagramIcon /></span></a>
          <MetalButton variant="steel" wrapperClassName="footer-book-wrap" className="metal-button-cta footer-book-button" type="button" data-cal-namespace="srt-sidecar-chat" data-cal-link="aryan-sharma-amw1me/srt-sidecar-chat" data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}' aria-label="Book a 15 minute SRT Sidecar chat"><Gauge size={13} /> Book a call</MetalButton>
        </div>
      </footer>
    </div>
  )
}

function formatDuration(seconds: number) { const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` }

export default App

