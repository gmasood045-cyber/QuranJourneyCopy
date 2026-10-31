// المصحف الرقمي — the approved Phase 1 Mushaf design, hosted as a first-class
// screen of the Next-generation preview. It reuses the Phase 1 reader
// components as they are (src/studio/mushaf); only the host wiring lives here.
// Design only: no app store, no production Reader, no saved progress.
import { createContext, useContext } from 'react'
import { pageOf } from '../../../lib/quran'
import '../../mushaf/mushaf-preview.css'
import { DesktopReader, type Tone } from '../../mushaf/desktop'
import { MobileReader, type MobileView } from '../../mushaf/mobile'
import { navTo, type Focus, type Go, type MushafNav } from '../../mushaf/page'
import { Chrome, useDevice, useProto } from '../core'
import { setReciteTarget } from './recite'
import { MushafIndex } from './mushafIndex'

/**
 * One navigation value (`nav`: page + optional exact ayah) shared by every frame.
 * `stage`: the surah / juz index first, then the reader (like opening a mushaf from its contents).
 */
export type MushafState = { nav: MushafNav; view: MobileView; tone: Tone; stage: 'index' | 'reader' }
export const MUSHAF_DEFAULT: MushafState = { nav: navTo(3), view: 'reading', tone: 'app', stage: 'index' }
/** Shared by the desktop and mobile frames so both show the same page and paper. */
export const MushafCtx = createContext<{ s: MushafState; set: (p: Partial<MushafState>) => void }>({ s: MUSHAF_DEFAULT, set: () => {} })

/** Opens the Digital Mushaf reader at an exact ayah (used by other screens, e.g. Similarities). */
export function useOpenInMushaf() {
  const { set } = useContext(MushafCtx)
  const { go } = useProto()
  return (s: number, a: number) => (set({ nav: navTo(pageOf(s, a), { s, a }), stage: 'reader', view: 'reading' }), go('mushaf'))
}

export function DigitalMushaf() {
  const device = useDevice()
  const { s, set } = useContext(MushafCtx)
  const { go: goScreen } = useProto()
  const setTone = (tone: Tone) => set({ tone })
  const back = () => set({ stage: 'index', view: 'reading', nav: navTo(s.nav.pg) })
  // Every entry point goes through navTo: manual page moves carry no focus (clearing any old one),
  // surah / juz moves carry their exact starting ayah, freshly stamped.
  const go: Go = (pg, focus) => set({ nav: navTo(pg, focus) })
  const open = (pg: number, focus?: Focus) => set({ nav: navTo(pg, focus), stage: 'reader', view: 'reading' })
  const recite = (rs: number, ra: number) => (setReciteTarget({ s: rs, a: ra }), goScreen('recite'))

  if (s.stage === 'index') return <MushafIndex pg={s.nav.pg} onOpen={open} />

  if (device === 'desktop')
    return (
      <Chrome dock={false}>
        <div className="mp h-full" data-tone={s.tone}>
          <DesktopReader nav={s.nav} onGo={go} tone={s.tone} setTone={setTone} auto onBack={back} onRecite={recite} />
        </div>
      </Chrome>
    )
  // Mobile reader is full-screen (no app dock), like the production Reader.
  return (
    <div className="mp absolute inset-0" data-tone={s.tone}>
      <MobileReader bare auto label="" pg={s.nav.pg} focus={s.nav.focus} view={s.view} tone={s.tone} setTone={setTone} onView={(view) => set({ view })} onGo={go} onBack={back} onRecite={recite} />
    </div>
  )
}
