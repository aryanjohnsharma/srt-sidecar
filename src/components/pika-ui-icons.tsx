import type { ComponentProps, SVGProps } from 'react'
import { PikaIcon } from '@pikaicons/react'
import {
  ArrowLeftIcon,
  CheckTickCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadBarDownIcon,
  File02Icon,
  FileIcon,
  GithubIcon,
  InstagramIcon,
  HeadphonesIcon,
  LayerTwoIcon,
  LockCloseIcon,
  MultipleCrossCancelIcon,
  MusicBeamNoteIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  RefreshIcon,
  Settings01Icon,
  ShieldCheckIcon,
  SparkleAi01Icon,
  UploadBarUpIcon,
  VolumeTwoIcon,
  XComIcon,
} from '@pikaicons/core-free'

type PikaProps = Omit<ComponentProps<typeof PikaIcon>, 'icon'>
type PikaIconData = ComponentProps<typeof PikaIcon>['icon']

function withPikaIcon(icon: PikaIconData) {
  return function PikaUiIcon({ size = 20, ...props }: PikaProps) {
    return <PikaIcon icon={icon} size={size} {...props} />
  }
}

export const AudioLines = withPikaIcon(MusicBeamNoteIcon)
export const ArrowDownToLine = withPikaIcon(DownloadBarDownIcon)
export const ArrowLeft = withPikaIcon(ArrowLeftIcon)
export const Check = withPikaIcon(CheckTickCircleIcon)
export const ChevronDown = withPikaIcon(ChevronDownIcon)
export const CircleHelp = withPikaIcon(QuestionMarkCircleIcon)
export const FileAudio2 = withPikaIcon(File02Icon)
export const FileText = withPikaIcon(FileIcon)
export const GitHub = withPikaIcon(GithubIcon)
export const Instagram = withPikaIcon(InstagramIcon)
export const Gauge = withPikaIcon(ClockIcon)
export const Headphones = withPikaIcon(HeadphonesIcon)
export const LockKeyhole = withPikaIcon(LockCloseIcon)
export const Pause = withPikaIcon(PauseCircleIcon)
export const Play = withPikaIcon(PlayCircleIcon)
export const Plus = withPikaIcon(PlusIcon)
export const RotateCcw = withPikaIcon(RefreshIcon)
export const Layers = withPikaIcon(LayerTwoIcon)
export const Settings2 = withPikaIcon(Settings01Icon)
export const ShieldCheck = withPikaIcon(ShieldCheckIcon)
export const Sparkles = withPikaIcon(SparkleAi01Icon)
export const Upload = withPikaIcon(UploadBarUpIcon)
export const Volume2 = withPikaIcon(VolumeTwoIcon)
export const X = withPikaIcon(MultipleCrossCancelIcon)
export const XBrand = withPikaIcon(XComIcon)

export function PortfolioIcon({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3" />
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.99 19.15c-.1-1.76-1.62-3.15-3.49-3.15h-7c-1.87 0-3.39 1.39-3.49 3.15m13.98 0C20.85 17.33 22 14.8 22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 2.8 1.15 5.33 3.01 7.15m13.98 0C17.19 20.91 14.72 22 12 22s-5.19-1.09-6.99-2.85" />
  </svg>
}
