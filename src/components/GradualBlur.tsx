import { useMemo, type CSSProperties } from 'react'
import './GradualBlur.css'

type Edge = 'top' | 'bottom' | 'left' | 'right'
type Curve = 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out'
type Props = {
  position?: Edge
  target?: 'parent' | 'page'
  height?: string | number
  width?: string | number
  strength?: number
  layers?: number
  curve?: Curve
  exponential?: boolean
  opacity?: number
  saturation?: number
  tint?: string
  zIndex?: number
  className?: string
  style?: CSSProperties
}

const CURVES: Record<Curve, (t: number) => number> = {
  linear: (t) => t,
  bezier: (t) => t * t * (3 - 2 * t),
  'ease-in': (t) => t * t,
  'ease-out': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
}
const DIRECTIONS: Record<Edge, string> = { top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' }
const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)
const toLength = (value: string | number) => typeof value === 'number' ? `${value}px` : value

export default function GradualBlur({
  position = 'bottom', target = 'parent', height = '6rem', width, strength = 2,
  layers = 8, curve = 'linear', exponential = true, opacity = 1, saturation = 1,
  tint = 'transparent', zIndex = 2, className = '', style,
}: Props) {
  const edge = position in DIRECTIONS ? position : 'bottom'
  const vertical = edge === 'top' || edge === 'bottom'
  const stack = useMemo(() => {
    const count = Math.min(Math.max(Math.round(layers) || 1, 1), 16)
    const shape = CURVES[curve] ?? CURVES.linear
    const maxBlur = Math.max(strength, 0) * 12
    const level = (u: number) => {
      const t = shape(clamp01(u))
      return maxBlur * (exponential ? (Math.pow(2, 4 * t) - 1) / 15 : t)
    }
    const boost = Math.pow(Math.max(saturation, 0), 1 / count)
    const steps = Array.from({ length: count }, (_, index) => {
      const from = level(index / count)
      const to = level((index + 1) / count)
      const radius = Math.sqrt(Math.max(to * to - from * from, 0))
      const filter = [
        `blur(calc(${radius.toFixed(3)}px * var(--gradual-blur-reveal, 1) * var(--gradual-blur-hover, 1)))`,
        boost !== 1 ? `saturate(calc(1 + ${(boost - 1).toFixed(4)} * var(--gradual-blur-reveal, 1)))` : '',
      ].filter(Boolean).join(' ')
      const mask = `linear-gradient(${DIRECTIONS[edge]}, transparent ${((index / count) * 100).toFixed(2)}%, #000 ${(((index + 1) / count) * 100).toFixed(2)}%)`
      return {
        position: 'absolute', inset: 0, borderRadius: 'inherit', backdropFilter: filter,
        WebkitBackdropFilter: filter, maskImage: mask, WebkitMaskImage: mask, opacity,
      } as CSSProperties
    })
    const stops = Array.from({ length: 9 }, (_, index) => {
      const u = index / 8
      const t = shape(u)
      const alpha = t * t * t * (t * (t * 6 - 15) + 10)
      return `rgba(0, 0, 0, ${alpha.toFixed(3)}) ${(u * 100).toFixed(1)}%`
    }).join(', ')
    const wash = tint && tint !== 'transparent' ? {
      position: 'absolute', inset: 0, borderRadius: 'inherit', background: tint,
      maskImage: `linear-gradient(${DIRECTIONS[edge]}, ${stops})`,
      WebkitMaskImage: `linear-gradient(${DIRECTIONS[edge]}, ${stops})`,
    } as CSSProperties : null
    return { steps, wash }
  }, [layers, curve, strength, exponential, saturation, edge, opacity, tint])

  const depth = toLength(vertical ? height : (width ?? height))
  const span = vertical && width != null ? toLength(width) : null
  const rounded = target !== 'page' && !span
  const corner = (a: Edge, b: Edge) => rounded && (edge === a || edge === b) ? 'inherit' : undefined
  const rootStyle: CSSProperties = {
    position: target === 'page' ? 'fixed' : 'absolute', zIndex,
    borderTopLeftRadius: corner('top', 'left'), borderTopRightRadius: corner('top', 'right'),
    borderBottomLeftRadius: corner('bottom', 'left'), borderBottomRightRadius: corner('bottom', 'right'),
    top: edge === 'bottom' ? undefined : 0, bottom: edge === 'top' ? undefined : 0,
    left: edge === 'right' ? undefined : 0, right: edge === 'left' ? undefined : 0,
    height: vertical ? depth : undefined, width: vertical ? (span ?? undefined) : depth,
    marginInline: span ? 'auto' : undefined, ...style,
  }

  return <div className={`gradual-blur ${className}`.trim()} style={rootStyle} aria-hidden="true">
    {stack.steps.map((layer, index) => <div key={index} style={layer} />)}
    {stack.wash && <div style={stack.wash} />}
  </div>
}
