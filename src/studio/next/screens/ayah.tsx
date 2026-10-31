// رحلة الحفظ — Memorization Journey (design preview). Real KFGQPC Hafs text and real
// recitation audio; Tafsir is fetched verbatim via lib/tafsir with its source.
// All progress lives in local preview state only.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Chrome, Demo, Icon, Placeholder, toAr, useDevice, useProto } from '../core'
import { JOURNEY } from '../data'
import { RECITERS, ayahAudioUrl, firstLetter, hizbOf, juzOf, loadMushaf, pageOf, surah, words } from '../../../lib/quran'
import { TAFSIRS, loadTafsir, type TafsirText } from '../../../lib/tafsir'

type Intent = 'hifz' | 'tadabbur' | 'both'
type Panel = 'read' | 'understand' | 'memorize' | 'connect'
type MemResult = 'mastered' | 'shaky' | 'forgot'
type Progress = { mem: Record<number, MemResult>; notes: Record<number, string> }

function useAyat() {
  const [ayat, setAyat] = useState<string[] | null>(null)
  const [hafs, setHafs] = useState(true)
  useEffect(() => {
    loadMushaf(JOURNEY.s).then((r) => (setAyat(r.ayat.slice(JOURNEY.from - 1, JOURNEY.to)), setHafs(r.hafs)))
  }, [])
  return { ayat, hafs }
}

/** Real recitation (EveryAyah) for one ayah, with repeat count. */
function useAudio() {
  const el = useRef<HTMLAudioElement | null>(null)
  const [st, setSt] = useState<{ a: number | null; t: number; busy: boolean; left: number }>({ a: null, t: 0, busy: false, left: 0 })
  useEffect(() => () => el.current?.pause(), [])
  const play = (a: number, times = 1) => {
    if (!el.current) el.current = new Audio()
    const au = el.current
    au.pause()
    au.src = ayahAudioUrl(RECITERS[0].id, JOURNEY.s, a)
    let left = times
    au.ontimeupdate = () => setSt((x) => ({ ...x, t: au.duration ? au.currentTime / au.duration : 0 }))
    au.onwaiting = () => setSt((x) => ({ ...x, busy: true }))
    au.onplaying = () => setSt((x) => ({ ...x, busy: false }))
    au.onended = () => {
      left -= 1
      if (left > 0) (au.currentTime = 0, void au.play(), setSt((x) => ({ ...x, left })))
      else setSt({ a: null, t: 0, busy: false, left: 0 })
    }
    au.onerror = () => setSt({ a: null, t: 0, busy: false, left: 0 })
    setSt({ a, t: 0, busy: true, left: times })
    au.play().catch(() => setSt({ a: null, t: 0, busy: false, left: 0 }))
  }
  const stop = () => (el.current?.pause(), setSt({ a: null, t: 0, busy: false, left: 0 }))
  return { ...st, play, stop }
}
type Audio = ReturnType<typeof useAudio>

const textSize = (t: string, desktop: boolean) => {
  const n = t.length
  if (desktop) return n < 70 ? 40 : n < 140 ? 32 : 27
  return n < 70 ? 32 : n < 140 ? 26 : 22
}

export function AyahJourney() {
  const device = useDevice()
  const { go } = useProto()
  const { ayat, hafs } = useAyat()
  const audio = useAudio()
  const [intent, setIntent] = useState<Intent>('both')
  const [cur, setCur] = useState(JOURNEY.from)
  const [panel, setPanel] = useState<Panel | null>(device === 'desktop' ? 'understand' : null)
  const [prog, setProg] = useState<Progress>({ mem: {}, notes: {} })
  const feed = useRef<HTMLDivElement>(null)

  // Track the ayah snapped into view.
  useEffect(() => {
    const root = feed.current
    if (!root || !ayat) return
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setCur(Number((e.target as HTMLElement).dataset.a))), { root, threshold: 0.6 })
    root.querySelectorAll('[data-a]').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [ayat])
  const scrollTo = (a: number) => feed.current?.querySelector(`[data-a="${a}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const panels: { id: Panel; ar: string; icon: string }[] = [
    { id: 'read', ar: 'اقرأ واستمع', icon: 'volume' },
    ...(intent !== 'hifz' ? [{ id: 'understand' as const, ar: 'افهم وتدبّر', icon: 'tafsir' }] : []),
    ...(intent !== 'tadabbur' ? [{ id: 'memorize' as const, ar: 'احفظ', icon: 'sprout' }] : []),
    { id: 'connect', ar: 'اربط الآيات', icon: 'layers' },
  ]
  const text = ayat?.[cur - JOURNEY.from] ?? ''
  const panelBody = (p: Panel) =>
    p === 'read' ? <ReadPanel a={cur} text={text} hafs={hafs} audio={audio} /> : p === 'understand' ? <UnderstandPanel key={cur} a={cur} text={text} note={prog.notes[cur] ?? ''} onSave={(t) => setProg((x) => ({ ...x, notes: { ...x.notes, [cur]: t } }))} /> : p === 'memorize' ? <MemorizePanel key={cur} a={cur} text={text} hafs={hafs} audio={audio} onResult={(r) => setProg((x) => ({ ...x, mem: { ...x.mem, [cur]: r } }))} result={prog.mem[cur]} /> : <ConnectPanel ayat={ayat ?? []} hafs={hafs} prog={prog} />

  const intentSwitch = (
    <div role="radiogroup" aria-label="نيّة الجلسة" className="inline-flex rounded-full bg-night/[.06] p-1 text-[12.5px]">
      {([['hifz', 'حفظ فقط'], ['tadabbur', 'تدبّر فقط'], ['both', 'حفظ + تدبّر']] as const).map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={intent === k} onClick={() => (setIntent(k), panel && !['read', 'connect'].includes(panel) && setPanel(k === 'hifz' ? 'memorize' : k === 'tadabbur' ? 'understand' : panel))} className={`press h-8 rounded-full px-3 ${intent === k ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-muted'}`}>{l}</button>
      ))}
    </div>
  )

  const slides = (ayat ?? Array.from({ length: 5 }, () => '')).map((t, i) => {
    const a = JOURNEY.from + i
    return (
      <section key={a} data-a={a} className={`relative flex snap-start snap-always flex-col ${device === 'desktop' ? 'h-full justify-center px-10' : 'h-full px-6 pb-36 pt-28'}`} aria-label={`الآية ${a}`}>
        <div className="flex flex-1 flex-col justify-center">
          <p className="mb-6 text-center text-[12.5px] text-muted">
            سورة {surah(JOURNEY.s).ar} · الآية {toAr(a)} <span className="mx-1 text-line">|</span> الجزء {toAr(juzOf(JOURNEY.s, a))} · ص {toAr(pageOf(JOURNEY.s, a))}
          </p>
          {t ? (
            <p className={`mf-text ${hafs ? '' : 'tanzil'} text-center`} style={{ fontSize: textSize(t, device === 'desktop'), lineHeight: 2.05, textAlignLast: 'center', color: 'var(--color-night)' }}>
              {t} <span className="mf-num">{toAr(a)}</span>
            </p>
          ) : (
            <div className="mx-auto h-24 w-4/5 animate-pulse rounded-3xl bg-night/5" />
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <StateChip icon="sprout" label="الحفظ" value={memLabel(prog.mem[a])} tone={prog.mem[a] === 'mastered' ? 'leaf' : prog.mem[a] ? 'gold' : 'none'} />
            <StateChip icon="note" label="التدبّر" value={prog.notes[a] ? 'تأمّل محفوظ' : 'لا تأمّل بعد'} tone={prog.notes[a] ? 'gold' : 'none'} />
          </div>
        </div>
        {i === 0 && device === 'mobile' && (
          <p className="absolute inset-x-0 bottom-28 flex flex-col items-center text-[11.5px] text-muted">
            <Icon name="chevronDown" size={18} className="animate-bounce" />
            اسحب للآية التالية
          </p>
        )}
      </section>
    )
  })

  if (device === 'desktop')
    return (
      <Chrome>
        <div className="flex h-full">
          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-line/60 px-8 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-arabic-display text-[19px] font-bold">رحلة الحفظ</p>
                <p className="text-[12.5px] text-muted">سورة {surah(JOURNEY.s).ar} · الآيات {toAr(JOURNEY.from)}–{toAr(JOURNEY.to)}</p>
              </div>
              {intentSwitch}
            </div>
            <div className="relative min-h-0 flex-1">
              <div ref={feed} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto">{slides}</div>
              <Dots cur={cur} onPick={scrollTo} />
            </div>
            <AudioBar a={cur} audio={audio} />
          </div>
          <aside className="flex w-[440px] shrink-0 flex-col border-s border-line/60 bg-card/50">
            <div className="flex gap-1 border-b border-line/60 p-3" role="tablist">
              {panels.map((p) => (
                <button key={p.id} type="button" role="tab" aria-selected={panel === p.id} onClick={() => setPanel(p.id)} className={`press flex flex-1 flex-col items-center gap-1 rounded-[14px] py-2 text-[12px] ${panel === p.id ? 'bg-gold-soft font-semibold text-night' : 'text-muted hover:bg-night/5'}`}>
                  <Icon name={p.icon} size={18} />
                  {p.ar}
                </button>
              ))}
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-6">{panelBody(panel && panels.some((x) => x.id === panel) ? panel : panels[0].id)}</div>
          </aside>
        </div>
      </Chrome>
    )

  return (
    <Chrome bare dock={false}>
      <div className="relative h-full">
        <div ref={feed} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto">{slides}</div>
        <div className="glass-panel absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-2 px-4 pb-3 pt-12" style={{ borderRadius: 0 }}>
          <div className="flex w-full items-center">
            <button type="button" onClick={() => go('home')} aria-label="رجوع" className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-night/5"><Icon name="back" className="rotate-180" /></button>
            <p className="flex-1 text-center text-[15px] font-semibold">رحلة الحفظ · {surah(JOURNEY.s).ar}</p>
            <span className="w-10" />
          </div>
          {intentSwitch}
        </div>
        <Dots cur={cur} onPick={scrollTo} />
        {/* Action rail */}
        <div className="absolute bottom-36 end-3 z-30 flex flex-col gap-3">
          {panels.filter((p) => p.id !== 'read').map((p) => (
            <button key={p.id} type="button" onClick={() => setPanel(p.id)} className="press flex flex-col items-center gap-1 text-[10.5px] font-medium text-night/80">
              <span className="glass-panel flex h-12 w-12 items-center justify-center rounded-full"><Icon name={p.icon} size={20} /></span>
              {p.ar.split(' ')[0]}
            </button>
          ))}
          <button type="button" className="press flex flex-col items-center gap-1 text-[10.5px] font-medium text-night/80">
            <span className="glass-panel flex h-12 w-12 items-center justify-center rounded-full"><Icon name="bookmark" size={20} /></span>
            علامة
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-7"><AudioBar a={cur} audio={audio} floating /></div>
        {panel && (
          <>
            <button type="button" aria-label="إغلاق" onClick={() => setPanel(null)} className="absolute inset-0 z-40 bg-black/30" />
            <div className="absolute inset-x-0 bottom-0 z-50 flex h-[80%] flex-col rounded-t-[30px] bg-parchment shadow-[0_-20px_50px_-20px_rgba(0,0,0,.4)]">
              <span className="mx-auto mt-2.5 block h-[5px] w-10 rounded-full bg-night/15" />
              <div className="no-scrollbar flex gap-1 overflow-x-auto px-4 pt-3" role="tablist">
                {panels.map((p) => (
                  <button key={p.id} type="button" role="tab" aria-selected={panel === p.id} onClick={() => setPanel(p.id)} className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] ${panel === p.id ? 'bg-night text-parchment' : 'bg-card text-night/75 ring-1 ring-line'}`}>
                    <Icon name={p.icon} size={15} />
                    {p.ar}
                  </button>
                ))}
              </div>
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">{panelBody(panel)}</div>
            </div>
          </>
        )}
      </div>
    </Chrome>
  )
}

const memLabel = (r?: MemResult) => (r === 'mastered' ? 'متقنة' : r === 'shaky' ? 'تحتاج مراجعة' : r === 'forgot' ? 'لم تُحفظ بعد' : 'لم تُسجَّل')

function StateChip({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'leaf' | 'gold' | 'none' }) {
  const c = tone === 'leaf' ? 'bg-leaf/10 text-leaf' : tone === 'gold' ? 'bg-gold-soft text-night' : 'bg-night/[.05] text-muted'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] ${c}`}>
      <Icon name={icon} size={14} />
      <b className="font-semibold">{label}:</b> {value}
    </span>
  )
}

function Dots({ cur, onPick }: { cur: number; onPick: (a: number) => void }) {
  return (
    <div className="absolute start-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2" aria-label="الآيات">
      {Array.from({ length: JOURNEY.to - JOURNEY.from + 1 }, (_, i) => JOURNEY.from + i).map((a) => (
        <button key={a} type="button" onClick={() => onPick(a)} aria-label={`الآية ${a}`} aria-current={a === cur} className={`w-1.5 rounded-full transition-all ${a === cur ? 'h-6 bg-gold' : 'h-1.5 bg-night/20 hover:bg-night/40'}`} />
      ))}
    </div>
  )
}

function AudioBar({ a, audio, floating = false }: { a: number; audio: Audio; floating?: boolean }) {
  const on = audio.a === a
  return (
    <div className={`${floating ? 'glass-panel rounded-[24px]' : 'border-t border-line/60'} flex items-center gap-3 px-4 py-3`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-soft text-[15px] font-bold text-gold">{RECITERS[0].ar[0]}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{RECITERS[0].ar.split(' (')[0]}</p>
        <span className="relative mt-1.5 block h-1 rounded-full bg-night/10"><span className="absolute inset-y-0 start-0 rounded-full bg-gold" style={{ width: `${on ? audio.t * 100 : 0}%` }} /></span>
      </div>
      <button type="button" onClick={() => audio.play(a, 3)} aria-label="تكرار ٣ مرات" className="press flex h-10 items-center gap-1 rounded-full px-2.5 text-[12px] text-muted hover:bg-night/5"><Icon name="repeat" size={17} />×٣</button>
      <button type="button" onClick={() => (on ? audio.stop() : audio.play(a))} aria-label={on ? 'إيقاف' : 'استماع'} className="press flex h-12 w-12 items-center justify-center rounded-full bg-night text-parchment">
        {on && audio.busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-parchment/30 border-t-parchment" /> : <Icon name={on ? 'pause' : 'play'} size={18} fill />}
      </button>
    </div>
  )
}

function Block({ title, badge, children, tone = 'card' }: { title: string; badge?: ReactNode; children: ReactNode; tone?: 'card' | 'paper' | 'note' }) {
  const cls = tone === 'paper' ? 'mf-paper rounded-[22px]' : tone === 'note' ? 'rounded-[22px] bg-gold-soft/45 ring-1 ring-gold/25' : 'rounded-[22px] bg-card ring-1 ring-line'
  return (
    <section className={`${cls} mb-4 p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[14.5px] font-semibold">{title}</h3>
        {badge}
      </div>
      {children}
    </section>
  )
}

function ReadPanel({ a, text, hafs, audio }: { a: number; text: string; hafs: boolean; audio: Audio }) {
  return (
    <div>
      <Block title={`سورة ${surah(JOURNEY.s).ar} · الآية ${toAr(a)}`} tone="paper">
        <p className={`mf-text ${hafs ? '' : 'tanzil'}`} style={{ fontSize: 26, lineHeight: 2.05 }}>{text} <span className="mf-num">{toAr(a)}</span></p>
      </Block>
      <Block title="الاستماع">
        <p className="mb-3 text-[13px] text-muted">تلاوة {RECITERS[0].ar} · من EveryAyah.com (يتطلب اتصالًا)</p>
        <div className="grid grid-cols-3 gap-2">
          {[1, 3, 5].map((n) => (
            <button key={n} type="button" onClick={() => audio.play(a, n)} className="press rounded-2xl bg-night/[.05] py-3 text-[13px] font-medium hover:bg-night/[.09]">{n === 1 ? 'مرة واحدة' : `${toAr(n)} مرات`}</button>
          ))}
        </div>
        {audio.a === a && <p className="mt-3 text-center text-[12px] text-gold">يُتلى الآن · متبقٍ {toAr(audio.left)}</p>}
      </Block>
    </div>
  )
}

function UnderstandPanel({ a, text, note, onSave }: { a: number; text: string; note: string; onSave: (t: string) => void }) {
  const [book, setBook] = useState(16)
  const [t, setT] = useState<{ d: TafsirText | null; err: boolean }>({ d: null, err: false })
  const [draft, setDraft] = useState(note)
  const [word, setWord] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setT({ d: null, err: false })
    loadTafsir(book, JOURNEY.s, a)
      .then((d) => live && setT({ d, err: false }))
      .catch(() => live && setT({ d: null, err: true }))
    return () => {
      live = false
    }
  }, [book, a])
  const b = TAFSIRS.find((x) => x.id === book)!
  const h = hizbOf(JOURNEY.s, a)
  return (
    <div>
      <Block title="التفسير الموثّق" badge={<span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[10.5px] font-semibold text-leaf"><Icon name="shield" size={12} />مصدر منشور</span>} tone="paper">
        <div className="mb-3 flex gap-1.5">
          {TAFSIRS.slice(0, 2).map((x) => (
            <button key={x.id} type="button" onClick={() => setBook(x.id)} className={`press rounded-full px-3 py-1.5 text-[12px] ${book === x.id ? 'bg-night text-parchment' : 'bg-night/[.05] text-night/75'}`}>{x.ar}</button>
          ))}
        </div>
        {t.err ? (
          <p className="text-[13px] text-muted">تعذّر تحميل التفسير. يتطلب اتصالًا بالإنترنت.</p>
        ) : t.d ? (
          <div className="max-h-64 space-y-2 overflow-y-auto text-[14px] leading-[1.95] text-[var(--mf-ink)]">
            {t.d.paragraphs.slice(0, 4).map((p, i) => (
              <p key={i}>{p.map((s, k) => <span key={k} className={s.quote ? 'mf-text inline text-[15px]' : ''}>{s.t}</span>)}</p>
            ))}
          </div>
        ) : (
          <div className="space-y-2">{[90, 80, 86].map((w) => <div key={w} className="h-3 animate-pulse rounded-full bg-night/[.07]" style={{ width: `${w}%` }} />)}</div>
        )}
        <p className="mt-3 border-t border-[var(--mf-frame-soft)] pt-2 text-[11.5px] text-[var(--mf-ink-soft)]">{b.ar} · {b.author} · عبر Quran.com API · يُعرض النص كما هو</p>
      </Block>

      <Block title="معاني الكلمات">
        <div className="flex flex-wrap gap-1.5" dir="rtl">
          {words(text).map((w, i) => (
            <button key={i} type="button" onClick={() => setWord(w)} className={`press mf-text rounded-xl px-2.5 py-1 text-[19px] ${word === w ? 'bg-gold-soft ring-1 ring-gold/40' : 'bg-night/[.04] hover:bg-night/[.08]'}`} style={{ lineHeight: 1.9 }}>{w}</button>
          ))}
        </div>
        {word && <Placeholder className="mt-3">معنى «<span className="mf-text inline text-[17px]">{word}</span>» يُعرض هنا من معجم أو ترجمة كلمات موثّقة مع ذكر المصدر عند التنفيذ.</Placeholder>}
      </Block>

      <Block title="سياق الآية">
        <dl className="grid grid-cols-2 gap-2 text-[12.5px]">
          {[['السورة', `${surah(JOURNEY.s).ar} · ${surah(JOURNEY.s).place === 'makkah' ? 'مكية' : 'مدنية'}`], ['عدد آياتها', toAr(surah(JOURNEY.s).ayat)], ['الموضع', `ص ${toAr(pageOf(JOURNEY.s, a))} · الجزء ${toAr(juzOf(JOURNEY.s, a))}`], ['الحزب', toAr(h.hizb)]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-night/[.04] px-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
          ))}
        </dl>
      </Block>

      <Block title="تأمّلي الشخصي" badge={<span className="inline-flex items-center gap-1 rounded-full bg-night/[.06] px-2 py-0.5 text-[10.5px] font-semibold text-muted"><Icon name="user" size={12} />خاص بك · ليس تفسيرًا</span>} tone="note">
        <p className="mb-2 text-[12.5px] text-muted">ما الذي استوقفك في هذه الآية؟ وما الذي تودّ العمل به اليوم؟</p>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="اكتب تأمّلك بكلماتك…" className="w-full resize-none rounded-2xl bg-card/80 p-3 text-[14px] leading-relaxed outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-gold" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11.5px] text-muted">{note ? 'محفوظ في المعاينة فقط' : 'يُحفظ على جهازك عند التنفيذ'}</span>
          <button type="button" disabled={!draft.trim()} onClick={() => onSave(draft.trim())} className="press h-9 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment disabled:opacity-40">حفظ التأمّل</button>
        </div>
      </Block>
    </div>
  )
}

const STEPS = ['اقرأ', 'استمع وردّد', 'إخفاء تدريجي', 'تلميحات', 'استرجاع', 'سجّل النتيجة']

function MemorizePanel({ a, text, hafs, audio, result, onResult }: { a: number; text: string; hafs: boolean; audio: Audio; result?: MemResult; onResult: (r: MemResult) => void }) {
  const [step, setStep] = useState(0)
  const [reads, setReads] = useState(0)
  const [hide, setHide] = useState(30)
  const [shown, setShown] = useState<Record<number, 1 | 2>>({})
  const [peek, setPeek] = useState(false)
  const ws = useMemo(() => words(text), [text])
  const hiddenAt = (i: number) => (step === 2 ? ((i * 7) % 10) * 10 < hide : step === 3 || (step === 4 && !peek))
  return (
    <div>
      <ol className="mb-5 grid grid-cols-6 gap-1" aria-label="مراحل الحفظ">
        {STEPS.map((l, i) => (
          <li key={l}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined} className="press flex w-full flex-col items-center gap-1 text-[10.5px]">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold ${i < step ? 'bg-leaf text-white' : i === step ? 'bg-gold text-white ring-4 ring-gold/20' : 'bg-night/[.06] text-muted'}`}>{i < step ? <Icon name="check" size={14} /> : toAr(i + 1)}</span>
              <span className={`text-center leading-tight ${i === step ? 'font-semibold' : 'text-muted'}`}>{l}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mf-paper rounded-[22px] px-5 py-6">
        <p className={`mf-text ${hafs ? '' : 'tanzil'}`} style={{ fontSize: 25, lineHeight: 2.15 }}>
          {ws.map((w, i) => {
            const hid = hiddenAt(i) && step !== 5
            const lvl = shown[i]
            return (
              <span key={i}>
                {hid && lvl !== 2 ? (
                  <button type="button" onClick={() => step >= 3 && setShown((x) => ({ ...x, [i]: lvl ? 2 : 1 }))} className="mx-0.5 inline-block min-w-[2.2em] rounded-md border-b-2 border-dashed border-gold/60 bg-gold-soft/40 px-1 align-baseline" aria-label="كلمة مخفية">
                    <span className={lvl === 1 ? 'text-gold' : 'invisible'}>{lvl === 1 ? `${firstLetter(w)}…` : w}</span>
                  </button>
                ) : (
                  w
                )}{' '}
              </span>
            )
          })}
          <span className="mf-num">{toAr(a)}</span>
        </p>
      </div>
      <div className="mt-4 rounded-[22px] bg-card p-4 ring-1 ring-line">
        {step === 0 && <StepRow hint="اقرأ الآية بتأنٍّ ثلاث مرات مع النظر في كلماتها." action={<button type="button" onClick={() => setReads((n) => Math.min(3, n + 1))} className="press h-10 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment">قرأتها · {toAr(reads)}/٣</button>} />}
        {step === 1 && <StepRow hint="استمع للقارئ ثم ردّد بعده بصوتك." action={<button type="button" onClick={() => audio.play(a, 3)} className="press flex h-10 items-center gap-1.5 rounded-full bg-night px-4 text-[13px] font-semibold text-parchment"><Icon name="play" size={15} fill />استمع ×٣</button>} />}
        {step === 2 && (
          <div>
            <StepRow hint="تُخفى الكلمات تدريجيًا. اقرأ من ذاكرتك وارفع النسبة كلما تمكّنت." />
            <input type="range" min={0} max={100} step={10} value={hide} onChange={(e) => setHide(Number(e.target.value))} aria-label="نسبة الإخفاء" className="mt-3 w-full accent-[var(--color-gold)]" />
            <p className="text-center text-[12px] text-muted">إخفاء {toAr(hide)}٪</p>
          </div>
        )}
        {step === 3 && <StepRow hint="اضغط الكلمة المخفية لترى أول حرف منها، واضغط مرة أخرى لإظهارها." />}
        {step === 4 && <StepRow hint="تلُ الآية كاملة من ذاكرتك، ثم تحقّق." action={<button type="button" onClick={() => setPeek((v) => !v)} className="press h-10 rounded-full bg-night/[.06] px-4 text-[13px] font-semibold">{peek ? 'أخفِ النص' : 'تحقّق من النص'}</button>} />}
        {step === 5 && (
          <div>
            <p className="mb-3 text-[13px] text-muted">كيف كان استرجاعك؟ تُسجَّل الآية «محفوظة» فقط عند اختيار «أتقنتها»؛ المشاهدة أو قراءة التفسير لا تُعدّ حفظًا.</p>
            <div className="grid grid-cols-3 gap-2">
              {([['mastered', 'أتقنتها', 'bg-leaf text-white'], ['shaky', 'أخطأت قليلًا', 'bg-gold-soft text-night'], ['forgot', 'لم أتذكّرها', 'bg-night/[.06] text-night']] as const).map(([k, l, c]) => (
                <button key={k} type="button" onClick={() => onResult(k)} aria-pressed={result === k} className={`press rounded-2xl py-3 text-[13px] font-semibold ${c} ${result === k ? 'ring-2 ring-night/40 ring-offset-2 ring-offset-card' : ''}`}>{l}</button>
              ))}
            </div>
            {result && <p className="mt-3 text-center text-[12px] text-muted">سُجّلت النتيجة في المعاينة فقط: «{memLabel(result)}»</p>}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-between">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="press h-10 rounded-full px-4 text-[13px] ring-1 ring-line disabled:opacity-35">السابق</button>
        {step < 5 && <button type="button" onClick={() => setStep((s) => s + 1)} className="press h-10 rounded-full bg-gold px-5 text-[13px] font-semibold text-white">التالي: {STEPS[step + 1]}</button>}
      </div>
    </div>
  )
}

function StepRow({ hint, action }: { hint: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <p className="flex-1 text-[13px] leading-relaxed text-muted">{hint}</p>
      {action}
    </div>
  )
}

function ConnectPanel({ ayat, hafs, prog }: { ayat: string[]; hafs: boolean; prog: Progress }) {
  const [tab, setTab] = useState<'chain' | 'next' | 'recite'>('chain')
  const [open, setOpen] = useState<number | null>(null)
  const [q, setQ] = useState(0)
  const [pick, setPick] = useState<number | null>(null)
  const [self, setSelf] = useState<Record<number, boolean>>({})
  const n = ayat.length
  const mem = Object.entries(prog.mem).filter(([, r]) => r === 'mastered').length
  const notes = Object.keys(prog.notes).length
  const head = (t: string, k = 3) => words(t).slice(0, k).join(' ')
  const tail = (t: string, k = 3) => words(t).slice(-k).join(' ')
  // "What comes next?" — options are real openings from this passage, in a fixed shuffled order.
  const opts = useMemo(() => (q + 1 < n ? [q + 1, (q + 3) % n, (q + 2) % n].filter((v, i, xs) => xs.indexOf(v) === i && v !== q).slice(0, 3).sort((x, y) => ((x * 5) % 3) - ((y * 5) % 3)) : []), [q, n])
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Meter label="حفظ المقطع" v={mem} n={n} tone="bg-leaf" sub="آيات سُجّلت «متقنة»" />
        <Meter label="تدبّر المقطع" v={notes} n={n} tone="bg-gold" sub="آيات لها تأمّل" />
      </div>
      <div role="tablist" className="mb-4 grid grid-cols-3 rounded-full bg-night/[.06] p-1 text-[12.5px]">
        {([['chain', 'المعنى والتسلسل'], ['next', 'ما التالي؟'], ['recite', 'التسميع الكامل']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`press h-8 rounded-full ${tab === k ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-muted'}`}>{l}</button>
        ))}
      </div>
      {tab === 'chain' && (
        <ol className="relative">
          {ayat.map((t, i) => {
            const a = JOURNEY.from + i
            return (
              <li key={a} className="relative pb-4 ps-12">
                {i < n - 1 && <span className="absolute bottom-0 start-[19px] top-10 w-px bg-gold/40" aria-hidden />}
                <span className="absolute start-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-gold-soft text-[13px] font-semibold ring-1 ring-gold/30">{toAr(a)}</span>
                <button type="button" onClick={() => setOpen(open === a ? null : a)} className="w-full rounded-[18px] bg-card p-3.5 text-start ring-1 ring-line hover:ring-gold/40">
                  <p className={`mf-text ${hafs ? '' : 'tanzil'} text-[19px]`} style={{ lineHeight: 1.9, textAlign: 'right', textAlignLast: 'right' }}>{head(t)} … {tail(t, 2)}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted"><Icon name="tafsir" size={13} />{open === a ? 'إخفاء المعنى' : 'معنى الآية من التفسير الميسّر'}</p>
                </button>
                {open === a && <TafsirSnippet a={a} />}
              </li>
            )
          })}
        </ol>
      )}
      {tab === 'next' && (
        <div>
          {q < n - 1 ? (
            <>
              <p className="mb-2 text-[12.5px] text-muted">سؤال {toAr(q + 1)} من {toAr(n - 1)} · بعد قوله تعالى:</p>
              <div className="mf-paper rounded-[18px] p-4"><p className={`mf-text ${hafs ? '' : 'tanzil'} text-[21px]`} style={{ lineHeight: 2 }}>… {tail(ayat[q], 4)} <span className="mf-num">{toAr(JOURNEY.from + q)}</span></p></div>
              <p className="mb-2 mt-4 text-[13px] font-semibold">بأيّ كلمات تبدأ الآية التالية؟</p>
              <div className="space-y-2">
                {opts.map((o) => {
                  const right = o === q + 1
                  const state = pick === null ? '' : o === pick ? (right ? 'bg-leaf/10 ring-leaf' : 'bg-clay/10 ring-clay/60') : right ? 'ring-leaf/60' : 'opacity-60'
                  return (
                    <button key={o} type="button" disabled={pick !== null} onClick={() => setPick(o)} className={`press w-full rounded-[16px] bg-card px-4 py-3 text-start ring-1 ring-line ${state}`}>
                      <span className={`mf-text ${hafs ? '' : 'tanzil'} text-[19px]`} style={{ lineHeight: 1.9 }}>{head(ayat[o], 3)} …</span>
                    </button>
                  )
                })}
              </div>
              {pick !== null && <button type="button" onClick={() => (setQ((x) => x + 1), setPick(null))} className="press mt-4 h-10 w-full rounded-full bg-night text-[13px] font-semibold text-parchment">{pick === q + 1 ? 'أحسنت · التالي' : 'راجع الربط · التالي'}</button>}
            </>
          ) : (
            <div className="text-center"><p className="font-semibold">أتممت ربط المقطع</p><button type="button" onClick={() => setQ(0)} className="press mt-3 h-10 rounded-full px-4 text-[13px] ring-1 ring-line">ابدأ من جديد</button></div>
          )}
        </div>
      )}
      {tab === 'recite' && (
        <div>
          <p className="mb-3 text-[13px] leading-relaxed text-muted">تلُ المقطع كاملًا دون النظر إلى النص، ثم قيّم كل آية بصدق.</p>
          <div className="mf-paper space-y-3 rounded-[22px] p-5">
            {ayat.map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="mf-num mf-text text-[22px]">{toAr(JOURNEY.from + i)}</span>
                <span className="h-px flex-1 border-b-2 border-dotted border-[var(--mf-frame-soft)]" />
                <button type="button" onClick={() => setSelf((x) => ({ ...x, [i]: !x[i] }))} className={`press rounded-full px-3 py-1 text-[11.5px] ${self[i] ? 'bg-leaf/10 text-leaf' : 'bg-night/[.05] text-muted'}`}>{self[i] ? 'تذكّرتها' : 'تعثّرت'}</button>
              </div>
            ))}
          </div>
          <button type="button" disabled className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-night/[.06] text-[13.5px] font-semibold text-muted">
            <Icon name="mic" size={18} />تسجيل التلاوة · يتوفّر عند التنفيذ
          </button>
          <p className="mt-2 text-center text-[11.5px] text-muted">التقييم الذاتي لا يغيّر حالة الحفظ؛ الحفظ يُسجَّل لكل آية من «احفظ».</p>
        </div>
      )}
    </div>
  )
}

function TafsirSnippet({ a }: { a: number }) {
  const [t, setT] = useState<TafsirText | null | false>(null)
  useEffect(() => {
    loadTafsir(16, JOURNEY.s, a).then(setT, () => setT(false))
  }, [a])
  return (
    <div className="mt-2 rounded-[16px] bg-[var(--mf-paper)] p-3 text-[13px] leading-[1.9] text-[var(--mf-ink)] ring-1 ring-[var(--mf-frame-soft)]">
      {t === null ? <div className="h-3 w-4/5 animate-pulse rounded-full bg-night/[.07]" /> : t === false ? 'تعذّر التحميل (يتطلب اتصالًا).' : t.paragraphs.map((p) => p.map((s) => s.t).join('')).join(' ')}
      <p className="mt-1 text-[11px] text-[var(--mf-ink-soft)]">التفسير الميسّر · مجمع الملك فهد</p>
    </div>
  )
}

function Meter({ label, v, n, tone, sub }: { label: string; v: number; n: number; tone: string; sub: string }) {
  return (
    <div className="rounded-[18px] bg-card p-3.5 ring-1 ring-line">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-0.5 text-[18px] font-bold">{toAr(v)}<span className="text-[13px] font-normal text-muted"> / {toAr(n)}</span></p>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-night/10"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${(v / Math.max(1, n)) * 100}%` }} /></span>
      <p className="mt-1.5 text-[10.5px] text-muted">{sub}</p>
    </div>
  )
}

export { Demo }
