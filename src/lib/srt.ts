export type Word = { id: string; text: string; start: number; end: number }
export type Cue = { index: number; start: number; end: number; text: string }
export type Settings = { maxWords: number; maxDuration: number | null; maxChars: number | null; sentenceAware: boolean; preservePauses: boolean }
export type CueIssue = { cueIndex: number; severity: 'error' | 'warning'; message: string }

function joinWords(words: Word[]) {
  return words.reduce((text, word) => {
    const token = word.text.trim()
    if (!token) return text
    if (!text) return token
    return /^[,.;:!?%)}\]”’]/u.test(token) ? `${text}${token}` : `${text} ${token}`
  }, '')
}

export function buildCues(words: Word[], settings: Settings): Cue[] {
  const cues: Cue[] = []
  let group: Word[] = []
  const flush = () => {
    if (!group.length) return
    cues.push({ index: cues.length + 1, start: group[0].start, end: group[group.length - 1].end, text: joinWords(group) })
    group = []
  }
  for (const word of words) {
    const pauseBefore = group.length > 0 && word.start - group[group.length - 1].end >= 0.6
    if (settings.preservePauses && pauseBefore) flush()
    const candidate = [...group, word]
    const text = joinWords(candidate)
    const durationExceeded = settings.maxDuration !== null && candidate.length > 1 && word.end - candidate[0].start > settings.maxDuration
    if (group.length && (candidate.length > settings.maxWords || durationExceeded || (settings.maxChars !== null && text.length > settings.maxChars))) flush()
    group.push(word)
    if (settings.sentenceAware && /[.!?][”’"')\]]?$/.test(word.text)) flush()
  }
  flush()
  return cues.map((cue, index) => ({ ...cue, index: index + 1 }))
}

export function formatTimestamp(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  const millis = ms % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`
}

export function serializeSrt(cues: Cue[]) {
  return cues.map((cue) => `${cue.index}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.text}`).join('\n\n') + (cues.length ? '\n' : '')
}

export function validateCues(cues: Cue[], settings: Settings): CueIssue[] {
  const issues: CueIssue[] = []
  let previousStart = -1
  let previousEnd = -1
  for (const cue of cues) {
    if (!cue.text.trim()) issues.push({ cueIndex: cue.index, severity: 'error', message: `Cue ${cue.index} has no text.` })
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start) {
      issues.push({ cueIndex: cue.index, severity: 'error', message: `Cue ${cue.index} has invalid timing. Review its word timings before export.` })
      continue
    }
    if (cue.start < previousStart) issues.push({ cueIndex: cue.index, severity: 'error', message: `Cue ${cue.index} is out of chronological order.` })
    else if (cue.start < previousEnd) issues.push({ cueIndex: cue.index, severity: 'warning', message: `Cue ${cue.index} overlaps the previous cue.` })
    if (settings.maxChars !== null && cue.text.length > settings.maxChars && cue.text.trim().split(/\s+/).length === 1) {
      issues.push({ cueIndex: cue.index, severity: 'warning', message: `Cue ${cue.index} contains a single word longer than the character limit. The word was kept intact.` })
    }
    previousStart = cue.start
    previousEnd = Math.max(previousEnd, cue.end)
  }
  return issues
}
