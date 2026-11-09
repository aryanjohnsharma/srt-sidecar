import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Check, ChevronDown } from './pika-ui-icons'
import './GlideSelect.css'

type Option = { value: string; label: string; tag?: string }
type Props = {
  options: Option[]
  value: string
  onChange: (value: string, option: Option) => void
  ariaLabel: string
  accentColor?: string
  surfaceColor?: string
  highlightColor?: string
  textColor?: string
  size?: 'sm' | 'md' | 'lg'
  radius?: number
  menuWidth?: number
  placement?: 'top' | 'bottom'
  align?: 'left' | 'right'
  popDuration?: number
  glideDuration?: number
  rememberPosition?: boolean
  className?: string
}

type Phase = 'closed' | 'open' | 'closing'
const SIZES = { sm: { chip: 28, row: 26, font: 12 }, md: { chip: 32, row: 30, font: 13 }, lg: { chip: 44, row: 40, font: 14 } }
const PAD = 4
const GAP = 1
const MENU_GAP = 6

export default function GlideSelect({
  options, value, onChange, ariaLabel, accentColor = '#0e8efa', surfaceColor = '#fff',
  highlightColor = '#eaf4ff', textColor = '#262925', size = 'md', radius = 9,
  menuWidth = 190, placement = 'bottom', align = 'left', popDuration = 180,
  glideDuration = 220, rememberPosition = true, className = '',
}: Props) {
  const selected = options.findIndex((option) => option.value === value)
  const [phase, setPhase] = useState<Phase>('closed')
  const [active, setActive] = useState<number | null>(null)
  const [side, setSide] = useState(placement)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const instant = useRef(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const scrub = useRef<{ id: number; top: number } | null>(null)
  const id = useId()
  const dimensions = SIZES[size]
  const step = dimensions.row + GAP
  const popOut = Math.round((popDuration * 2) / 3)

  useLayoutEffect(() => {
    if (phase !== 'open') return
    const menu = menuRef.current
    const root = rootRef.current
    if (!menu || !root) return
    const rect = root.getBoundingClientRect()
    const needed = menu.offsetHeight + MENU_GAP
    setSide(placement === 'bottom' && rect.bottom + needed > window.innerHeight
      ? 'top'
      : placement === 'top' && rect.top - needed < 0 ? 'bottom' : placement)
    menu.style.transitionDuration = instant.current ? '0ms' : ''
    menu.dataset.state = 'closed'
    void menu.offsetHeight
    menu.dataset.state = 'open'
    if (pillRef.current) {
      pillRef.current.style.transition = 'none'
      pillRef.current.style.transform = `translateY(${Math.max(0, selected) * step}px)`
      pillRef.current.style.opacity = '0'
      void pillRef.current.offsetHeight
      pillRef.current.style.transition = ''
    }
  }, [phase, placement, selected, step])

  useLayoutEffect(() => {
    const pill = pillRef.current
    if (!pill || phase !== 'open') return
    if (active === null) { pill.style.opacity = '0'; return }
    const jump = instant.current || pill.style.opacity !== '1'
    pill.style.transitionDuration = jump ? '0ms, 150ms' : ''
    pill.style.transform = `translateY(${active * step}px)`
    pill.style.opacity = '1'
    instant.current = false
  }, [active, phase, step])

  const open = (viaKey: boolean) => {
    clearTimeout(closeTimer.current)
    instant.current = true
    setActive(selected >= 0 ? selected : viaKey ? 0 : null)
    setPhase('open')
  }

  const close = (animated = true) => {
    setActive(null)
    clearTimeout(closeTimer.current)
    if (!animated || !menuRef.current) { setPhase('closed'); return }
    menuRef.current.style.transitionDuration = ''
    menuRef.current.dataset.state = 'closed'
    setPhase('closing')
    closeTimer.current = window.setTimeout(() => setPhase('closed'), popOut + 20)
  }

  const pick = (index: number, viaKey = false) => {
    const option = options[index]
    if (!option) { close(false); return }
    if (option.value !== value) onChange(option.value, option)
    close(false)
    if (!viaKey && rootRef.current) rootRef.current.dataset.swap = ''
    triggerRef.current?.focus({ preventScroll: true })
  }

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key
    const current = active ?? Math.max(0, selected)
    if (phase !== 'open') {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(key)) {
        event.preventDefault()
        open(true)
      }
      return
    }
    const go = (index: number) => {
      event.preventDefault()
      instant.current = true
      setActive(Math.min(options.length - 1, Math.max(0, index)))
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') go(current + (key === 'ArrowDown' ? 1 : -1))
    else if (key === 'Home' || key === 'End') go(key === 'Home' ? 0 : options.length - 1)
    else if (key === 'Enter' || key === ' ') { event.preventDefault(); pick(current, true) }
    else if (key === 'Escape' || key === 'Tab') { if (key === 'Escape') event.preventDefault(); close(false) }
    else if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const query = key.toLocaleLowerCase()
      const found = options.findIndex((option, index) => index !== current && option.label.toLocaleLowerCase().startsWith(query))
      if (found >= 0) go(found)
    }
  }

  useEffect(() => {
    if (phase === 'closed') return
    const onDown = (event: globalThis.PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close(true)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [phase])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const rowAt = (y: number) => {
    const current = scrub.current
    if (!current) return null
    const index = Math.floor((y - current.top - PAD) / step)
    return index >= 0 && index < options.length ? index : null
  }
  const onListDown = (event: PointerEvent<HTMLDivElement>) => {
    if (scrub.current) return
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* Pointer capture is optional. */ }
    scrub.current = { id: event.pointerId, top: event.currentTarget.getBoundingClientRect().top }
    instant.current = true
    setActive(rowAt(event.clientY))
  }
  const onListMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrub.current || scrub.current.id !== event.pointerId) return
    const index = rowAt(event.clientY)
    if (index !== active) setActive(index)
  }
  const onListUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrub.current || scrub.current.id !== event.pointerId) return
    const index = event.type === 'pointerup' ? rowAt(event.clientY) : null
    scrub.current = null
    if (index !== null) pick(index)
    else if (!rememberPosition) setActive(null)
  }
  const onListOver = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || scrub.current) return
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-index]')
    if (!row) return
    const index = Number(row.dataset.index)
    if (index !== active) setActive(index)
  }

  const origin = `${side === 'bottom' ? 'top' : 'bottom'} ${align}`
  const style = {
    '--gs-accent': accentColor, '--gs-surface': surfaceColor, '--gs-highlight': highlightColor,
    '--gs-text': textColor, '--gs-radius': `${radius}px`, '--gs-inner-radius': `${Math.max(3, radius - 4)}px`,
    '--gs-chip': `${dimensions.chip}px`, '--gs-row': `${dimensions.row}px`, '--gs-font': `${dimensions.font}px`,
    '--gs-menu-w': `${menuWidth}px`, '--gs-pop': `${popDuration}ms`, '--gs-pop-out': `${popOut}ms`,
    '--gs-glide': `${glideDuration}ms`, '--gs-origin': origin,
  } as CSSProperties

  return <div ref={rootRef} className={`glide-select${className ? ` ${className}` : ''}`} style={style}
    onAnimationEnd={(event) => { if (event.animationName === 'gs-swap') delete event.currentTarget.dataset.swap }}>
    <button ref={triggerRef} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={phase === 'open'}
      aria-controls={`${id}-list`} aria-activedescendant={active !== null ? `${id}-${active}` : undefined}
      aria-label={ariaLabel} className="glide-select__trigger" onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus({ preventScroll: true })
        if (phase === 'open') close(true)
        else open(false)
      }} onKeyDown={onTriggerKey}>
      <span className="glide-select__label" key={value} data-empty={selected < 0 ? '' : undefined}>{selected >= 0 ? options[selected].label : 'Select…'}</span>
      <span className="glide-select__chevron" aria-hidden="true"><ChevronDown size={14} /></span>
    </button>
    {phase !== 'closed' && <div ref={menuRef} className="glide-select__menu" data-state={phase === 'open' ? 'open' : 'closed'} data-side={side} data-align={align}>
      <div id={`${id}-list`} role="listbox" aria-label={ariaLabel} className="glide-select__list" data-live={active !== null ? '' : undefined}
        onPointerOver={onListOver} onPointerLeave={() => { if (!scrub.current && !rememberPosition) setActive(null) }}
        onPointerDown={onListDown} onPointerMove={onListMove} onPointerUp={onListUp} onPointerCancel={onListUp} onLostPointerCapture={onListUp}>
        <span ref={pillRef} className="glide-select__pill" aria-hidden="true" />
        {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={index === selected} data-index={index} className="glide-select__option">
          <span className="glide-select__name">{option.label}</span>
          {option.tag && <span className="glide-select__tag">{option.tag}</span>}
          <span className="glide-select__check" data-on={index === selected ? '' : undefined} aria-hidden="true"><Check size={14} /></span>
        </div>)}
      </div>
    </div>}
  </div>
}
