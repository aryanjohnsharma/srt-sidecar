import type { ComponentProps } from 'react'
import { PikaIcon } from '@pikaicons/react'
import {
  ArrowLeftIcon,
  CheckTickCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadBarDownIcon,
  File02Icon,
  FileIcon,
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
