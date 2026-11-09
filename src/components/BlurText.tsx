import { MotionConfig, motion, type MotionStyle, type TargetAndTransition, type Transition } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

type Direction = 'top' | 'bottom' | 'left' | 'right'
type Effect = 'blur' | 'zoom' | 'tilt' | 'focus' | 'drift'
type Trigger = 'view' | 'load' | 'hover' | 'click'
type Phase = 'from' | 'in' | 'out' | 'rest'
type Piece = { word: number; content: string; key: string }
type Frame = Record<string, any>
type EffectConfig = {
  from: Frame
  steps: Frame[]
  exit: Frame
  times: number[]
  fade: any
  bounce: number | null
  settle: number
  exitEase: any
  origin?: CSSProperties
}

export type BlurTextProps = {
  text?: string
  delay?: number
  className?: string
  animateBy?: 'words' | 'letters'
  direction?: Direction
  threshold?: number
  rootMargin?: string
  animationFrom?: Frame
  animationTo?: Frame[]
  easing?: any
  onAnimationComplete?: () => void
  stepDuration?: number
  blur?: number
  distance?: number
  effect?: Effect
  staggerFrom?: 'start' | 'center' | 'end' | 'random'
  trigger?: Trigger
  loop?: boolean
  loopDelay?: number
  color?: string
  fromColor?: string
  focusOnHover?: boolean
  as?: 'p' | 'span'
  waitForEvent?: string
}

const AXES: Record<Direction, ['x' | 'y', -1 | 1]> = {
  top: ['y', -1],
  bottom: ['y', 1],
  left: ['x', -1],
  right: ['x', 1],
}
const EASE_OUT = [0.33, 1, 0.68, 1]
const EASE_IN_OUT = [0.65, 0, 0.35, 1]
const EASE_IN = [0.55, 0, 0.9, 0.45]
const CSS_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const MOVE_KEYS = ['x', 'y', 'scale', 'rotateX', 'rotateY', 'skewX']
const INSTANT: Transition = { duration: 0 }
const SR_ONLY: CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap',
  border: 0, userSelect: 'none',
}
const PIECE_STYLE: MotionStyle = { display: 'inline-block', willChange: 'transform, filter, opacity' }
const WORD_STYLE: CSSProperties = { display: 'inline-flex' }

const blurTo = (px: number) => `blur(${Math.max(0, px)}px)`

function buildEffect(effect: Effect, direction: Direction, blur: number, distance: number): EffectConfig {
  const [axis, sign] = AXES[direction] ?? AXES.top
  const b = Math.max(0, blur)
  const d = distance

  if (effect === 'zoom') return {
    from: { filter: blurTo(b * 1.2), opacity: 0, scale: 1.4, [axis]: sign * d * 0.35 },
    steps: [
      { filter: blurTo(b * 0.2), opacity: 0.9, scale: 0.97, [axis]: -sign * d * 0.03 },
      { filter: blurTo(0), opacity: 1, scale: 1, [axis]: 0 },
    ],
    exit: { filter: blurTo(b), opacity: 0, scale: 0.82, [axis]: -sign * d * 0.2 },
    times: [0, 0.6, 1], fade: EASE_OUT, bounce: 0.25, settle: 0.5, exitEase: EASE_IN,
  }

  if (effect === 'tilt') {
    const rotate = axis === 'y' ? 'rotateX' : 'rotateY'
    const lean = axis === 'y' ? -sign : sign
    return {
      from: { filter: blurTo(b), opacity: 0, [rotate]: lean * 55, [axis]: sign * d * 0.5, transformPerspective: 600 },
      steps: [
        { filter: blurTo(b * 0.15), opacity: 0.95, [rotate]: -lean * 8, [axis]: -sign * d * 0.04, transformPerspective: 600 },
        { filter: blurTo(0), opacity: 1, [rotate]: 0, [axis]: 0, transformPerspective: 600 },
      ],
      exit: { filter: blurTo(b), opacity: 0, [rotate]: -lean * 40, [axis]: -sign * d * 0.3, transformPerspective: 600 },
      times: [0, 0.6, 1], fade: EASE_OUT, bounce: 0.3, settle: 0.8,
      origin: { transformOrigin: axis === 'x' ? (sign < 0 ? 'left center' : 'right center') : (sign < 0 ? 'center top' : 'center bottom') },
      exitEase: EASE_IN,
    }
  }

  if (effect === 'focus') {
    const soft = { filter: blurTo(b * 1.4), opacity: 0.32, scale: 1.12 }
    return {
      from: soft,
      steps: [{ filter: blurTo(b * 0.1), opacity: 0.95, scale: 0.995 }, { filter: blurTo(0), opacity: 1, scale: 1 }],
      exit: soft, times: [0, 0.72, 1], fade: EASE_IN_OUT, bounce: null, settle: 1, exitEase: EASE_IN_OUT,
    }
  }

  if (effect === 'drift') {
    const h = direction === 'right' ? 1 : -1
    const v = axis === 'y' ? sign : 0
    return {
      from: { filter: blurTo(b), opacity: 0, x: h * d * 1.6, y: v * d * 0.3, skewX: h * 28 },
      steps: [
        { filter: blurTo(b * 0.15), opacity: 0.95, x: -h * d * 0.06, y: 0, skewX: -h * 7 },
        { filter: blurTo(0), opacity: 1, x: 0, y: 0, skewX: 0 },
      ],
      exit: { filter: blurTo(b), opacity: 0, x: -h * d * 1.2, y: -v * d * 0.2, skewX: h * 20 },
      times: [0, 0.62, 1], fade: EASE_OUT, bounce: 0.3, settle: 0.55, exitEase: EASE_IN,
    }
  }

  return {
    from: { filter: blurTo(b), opacity: 0, [axis]: sign * d },
    steps: [
      { filter: blurTo(b / 2), opacity: 0.5, [axis]: (-sign * d) / 10 },
      { filter: blurTo(0), opacity: 1, [axis]: 0 },
    ],
    exit: { filter: blurTo(b), opacity: 0, [axis]: -sign * d * 0.6 },
    times: [0, 0.5, 1], fade: 'linear', bounce: 0.35, settle: 0.5, exitEase: EASE_IN,
  }
}

function buildKeyframes(from: Frame, steps: Frame[]): Frame {
  const keys = new Set([...Object.keys(from), ...steps.flatMap((step) => Object.keys(step))])
  const keyframes: Frame = {}
  keys.forEach((key) => { keyframes[key] = [from[key], ...steps.map((step) => step[key])] })
  return keyframes
}

function buildRanks(count: number, staggerFrom: NonNullable<BlurTextProps['staggerFrom']>, seedText: string): number[] {
  const ranks = Array.from({ length: count }, (_, index) => index)
  if (staggerFrom === 'end') return ranks.map((index) => count - 1 - index)
  if (staggerFrom === 'center') {
    const mid = (count - 1) / 2
    const offset = count % 2 === 0 ? 0.5 : 0
    return ranks.map((index) => Math.abs(index - mid) - offset)
  }
  if (staggerFrom === 'random') {
    let seed = 2166136261
    for (let index = 0; index < seedText.length; index++) seed = Math.imul(seed ^ seedText.charCodeAt(index), 16777619) >>> 0
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    const order = ranks.slice()
    for (let index = order.length - 1; index > 0; index--) {
      const j = Math.floor(next() * (index + 1))
      ;[order[index], order[j]] = [order[j], order[index]]
    }
    order.forEach((piece, rank) => { ranks[piece] = rank })
  }
  return ranks
}

const startPhase = (trigger: Trigger, waitForEvent?: string): Phase =>
  trigger === 'load' ? (waitForEvent ? 'from' : 'in') : trigger === 'hover' || trigger === 'click' ? 'rest' : 'from'

export default function BlurText({
  text = '', delay = 200, className = '', animateBy = 'words', direction = 'top', threshold = 0.1,
  rootMargin = '0px', animationFrom, animationTo, easing, onAnimationComplete,
  stepDuration = 0.35, blur = 10, distance = 50, effect = 'blur', staggerFrom = 'start',
  trigger = 'view', loop = false, loopDelay = 2, color, fromColor, focusOnHover = false,
  as = 'p', waitForEvent,
}: BlurTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [phase, setPhase] = useState<Phase>(() => startPhase(trigger, waitForEvent))
  const firstPhase = useRef(phase).current
  const [focusWord, setFocusWord] = useState(-1)
  const settledRef = useRef(phase === 'rest')
  const completeRef = useRef(onAnimationComplete)
  completeRef.current = onAnimationComplete

  const fx = useMemo(() => buildEffect(effect, direction, blur, distance), [effect, direction, blur, distance])
  const custom = Boolean(animationFrom || animationTo || easing)
  const fromSnapshot = animationFrom ?? fx.from
  const toSnapshots = animationTo ?? fx.steps
  const exitSnapshot = animationFrom ?? fx.exit
  const restSnapshot = toSnapshots[toSnapshots.length - 1]
  const animateKeyframes = useMemo(
    () => buildKeyframes(fromSnapshot, toSnapshots),
    [fromSnapshot, toSnapshots],
  )
  const stepCount = toSnapshots.length + 1
  const totalDuration = stepDuration * (stepCount - 1)
  const times = animationTo ? Array.from({ length: stepCount }, (_, index) => index / Math.max(1, stepCount - 1)) : fx.times
  const stagger = Math.max(0, delay) / 1000
  const exitDuration = stepDuration * 1.3
  const exitStagger = stagger * 0.4
  const words = useMemo(() => text.split(' '), [text])
  const pieces = useMemo<Piece[]>(() => {
    const list: Piece[] = []
    words.forEach((word, wordIndex) => {
      const isLast = wordIndex === words.length - 1
      if (animateBy === 'words') {
        list.push({ word: wordIndex, content: isLast ? word : `${word}\u00A0`, key: `word-${wordIndex}` })
        return
      }
      Array.from(word).forEach((char, charIndex) => list.push({ word: wordIndex, content: char, key: `char-${wordIndex}-${charIndex}` }))
      if (!isLast) list.push({ word: wordIndex, content: '\u00A0', key: `space-${wordIndex}` })
    })
    return list
  }, [words, animateBy])
  const groups = useMemo(() => {
    const list = words.map((): number[] => [])
    pieces.forEach((piece, index) => list[piece.word].push(index))
    return list
  }, [words, pieces])
  const ranks = useMemo(() => buildRanks(pieces.length, staggerFrom, text), [pieces.length, staggerFrom, text])
  const maxRank = ranks.reduce((max, rank) => Math.max(max, rank), 0)
  const inTotal = (totalDuration * (custom ? 1 : Math.max(1, fx.settle * 2.2)) + maxRank * stagger) * 1000
  const outTotal = (exitDuration + maxRank * exitStagger) * 1000

  useEffect(() => {
    if (phase !== 'from') return undefined
    if (trigger === 'load') {
      if (!waitForEvent) { setPhase('in'); return undefined }
      const start = () => setPhase((current) => current === 'from' ? 'in' : current)
      window.addEventListener(waitForEvent, start, { once: true })
      return () => window.removeEventListener(waitForEvent, start)
    }
    if (trigger === 'hover' || trigger === 'click') { setPhase('rest'); return undefined }
    const element = ref.current
    if (!element) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setPhase((current) => current === 'from' ? 'in' : current)
        observer.disconnect()
      }
    }, { threshold, rootMargin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [phase, trigger, threshold, rootMargin, waitForEvent])

  useEffect(() => {
    let timer = 0
    if (phase === 'in') {
      settledRef.current = false
      timer = window.setTimeout(() => {
        settledRef.current = true
        completeRef.current?.()
        if (loop) timer = window.setTimeout(() => setPhase('out'), Math.max(0, loopDelay) * 1000)
      }, inTotal)
    } else if (phase === 'rest') {
      settledRef.current = true
      if (loop) timer = window.setTimeout(() => setPhase('out'), Math.max(0, loopDelay) * 1000)
    } else if (phase === 'out') {
      settledRef.current = false
      timer = window.setTimeout(() => setPhase('in'), outTotal)
    }
    return () => window.clearTimeout(timer)
  }, [phase, loop, loopDelay, inTotal, outTotal])

  const replay = () => { if (phase !== 'out' && phase !== 'from') setPhase('out') }
  const handleEnter = () => { if (settledRef.current) replay() }
  const inTransition = (rank: number): Transition => {
    const delayed = rank * stagger
    if (custom) return { duration: totalDuration, times, delay: delayed, ease: easing ?? 'linear' } as Transition
    const transition: Record<string, any> = { duration: totalDuration, delay: delayed, ease: fx.fade }
    if (fx.bounce === null) return transition as Transition
    const move = { type: 'spring', visualDuration: totalDuration * fx.settle, bounce: fx.bounce, delay: delayed }
    MOVE_KEYS.forEach((key) => { if (key in fromSnapshot) transition[key] = move })
    return transition as Transition
  }

  const target = phase === 'in' ? animateKeyframes : phase === 'out' ? exitSnapshot : phase === 'rest' ? restSnapshot : fromSnapshot
  const tinted = Boolean(fromColor) && (phase === 'from' || phase === 'out')
  const dim = Math.min(6, Math.max(2, blur * 0.3))
  const pieceStyle: MotionStyle = fx.origin && !custom ? { ...PIECE_STYLE, ...fx.origin } : PIECE_STYLE

  const renderPiece = (index: number) => {
    const piece = pieces[index]
    const rank = ranks[index]
    const transition = phase === 'in'
      ? inTransition(rank)
      : phase === 'out'
        ? { duration: exitDuration, ease: fx.exitEase, delay: rank * exitStagger } as Transition
        : INSTANT
    const style: MotionStyle = fromColor
      ? {
          ...pieceStyle,
          color: tinted ? fromColor : undefined,
          transition: phase === 'in'
            ? `color ${totalDuration * 0.9}s ${CSS_EASE} ${rank * stagger}s`
            : phase === 'out' ? `color ${exitDuration}s ${CSS_EASE} ${rank * exitStagger}s` : 'none',
        }
      : pieceStyle
    return <motion.span aria-hidden="true" key={piece.key} style={style} initial={firstPhase === 'rest' ? false : fromSnapshot as TargetAndTransition} animate={target as TargetAndTransition} transition={transition}>{piece.content}</motion.span>
  }
  const wordStyle = (word: number): CSSProperties => {
    if (!focusOnHover) return WORD_STYLE
    const dimmed = focusWord !== -1 && focusWord !== word
    return { ...WORD_STYLE, filter: dimmed ? `blur(${dim}px)` : 'blur(0px)', opacity: dimmed ? 0.3 : 1, transition: `filter 0.45s ${CSS_EASE}, opacity 0.45s ${CSS_EASE}` }
  }
  const Wrapper = as

  return (
    <MotionConfig reducedMotion="never">
      <Wrapper
        ref={ref as never}
        className={className}
        style={{ display: 'flex', flexWrap: 'wrap', color, cursor: trigger === 'click' ? 'pointer' : undefined, justifyContent: 'center' }}
        onPointerEnter={trigger === 'hover' ? handleEnter : undefined}
        onClick={trigger === 'click' ? replay : undefined}
      >
        <span style={SR_ONLY}>{text}</span>
        {groups.map((indices, word) => (
          <span
            key={`word-${word}`}
            style={wordStyle(word)}
            onPointerEnter={focusOnHover ? () => setFocusWord(word) : undefined}
            onPointerLeave={focusOnHover ? () => setFocusWord(-1) : undefined}
          >
            {indices.map(renderPiece)}
          </span>
        ))}
      </Wrapper>
    </MotionConfig>
  )
}
