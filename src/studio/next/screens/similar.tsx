// المتشابهات والروابط القرآنية — design preview.
// Data integrity: the project has NO verified, curated similarity dataset yet, so
// this screen never asserts that two verses "are" mutashabihat. Curated and
// thematic sections show labelled empty states. What works today is mechanical
// and transparent: a word-level text search over the exact KFGQPC Hafs text, a
// side-by-side word diff of two verses the user chooses, and practice built only
// from pairs the user added. All Quranic text is loaded verbatim, never edited.
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Chrome, Head, Icon, MoreTabs, toAr, useDevice } from '../core'
import { SURAHS, isMark, loadMushaf, pageOf, surah, words } from '../../../lib/quran'
import { useOpenInMushaf } from './mushaf'

type Ref = { s: number; a: number }
type Pair = { a: Ref; b: Ref }
/** Verified similarity records would live here, each with its scholarly source. None are bundled yet. */
const CURATED: { pair: Pair; kind: 'start' | 'end' | 'wording'; source: string }[] = []

// ---- Shared preview state (both device frames show the same session)
type St = { lens: 'textual' | 'thematic'; tab: 'discover' | 'compare' | 'practice' | 'connect'; slotA: Ref | null; slotB: Ref | null; pairs: Pair[]; q: string; where: 'any' | 'start' | 'end' }
let st: St = { lens: 'textual', tab: 'discover', slotA: null, slotB: null, pairs: [], q: '', where: 'any' }
const subs = new Set<() => void>()
const set = (p: Partial<St>) => ((st = { ...st, ...p }), subs.forEach((f) => f()))
const useSt = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => st)

// ---- Text utilities (matching only; display always uses the original words)
/** Consonantal skeleton for matching Uthmani text against typed text: drops harakat, Quranic marks, alef/hamza seats and tatweel. */
export const skel = (w: string) =>
  w
    .normalize('NFC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[إأآٱاء]/g, '')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A]/g, '')
const tokens = (t: string) => words(t).map((w) => ({ w, k: isMark(w) ? '' : skel(w) }))
const refAr = (r: Ref) => `${surah(r.s).ar} · ${toAr(r.a)}`

type Row = { s: number; a: number; t: string; hafs: boolean; sk: string }
let corpus: Promise<Row[]> | null = null
/** All 6,236 ayat (loaded once, verbatim, on the first search), fetched a few surahs at a time. */
function loadCorpus() {
  corpus ??= (async () => {
    const out: Row[][] = []
    for (let i = 0; i < SURAHS.length; i += 8) {
      const batch = await Promise.all(SURAHS.slice(i, i + 8).map((x) => loadMushaf(x.n).then((r) => r.ayat.map((t, k) => ({ s: x.n, a: k + 1, t, hafs: r.hafs, sk: ` ${tokens(t).map((z) => z.k).filter(Boolean).join(' ')} ` })))))
      out.push(...batch)
    }
    return out.flat()
  })()
  corpus.catch(() => (corpus = null))
  return corpus
}
function useAyah(r: Ref | null) {
  const [t, setT] = useState<{ key: string; t: string; hafs: boolean } | null>(null)
  const key = r ? `${r.s}:${r.a}` : ''
  useEffect(() => {
    if (!r) return
    let live = true
    loadMushaf(r.s).then((x) => live && setT({ key, t: x.ayat[r.a - 1], hafs: x.hafs }))
    return () => {
      live = false
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return t && t.key === key ? t : null
}

/** Word-level diff (LCS over comparable words). Each original word is tagged same / diff / mark. */
export function diff(ta: string, tb: string) {
  const A = tokens(ta)
  const B = tokens(tb)
  const ia = A.map((x, i) => i).filter((i) => A[i].k)
  const ib = B.map((x, i) => i).filter((i) => B[i].k)
  const n = ia.length
  const m = ib.length
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[ia[i]].k === B[ib[j]].k ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const sa = new Set<number>()
  const sb = new Set<number>()
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (A[ia[i]].k === B[ib[j]].k) (sa.add(ia[i]), sb.add(ib[j]), i++, j++)
    else if (L[i + 1][j] >= L[i][j + 1]) i++
    else j++
  }
  let pre = 0
  while (pre < Math.min(n, m) && A[ia[pre]].k === B[ib[pre]].k) pre++
  let suf = 0
  while (suf < Math.min(n, m) - pre && A[ia[n - 1 - suf]].k === B[ib[m - 1 - suf]].k) suf++
  const tag = (T: typeof A, same: Set<number>) => T.map((x, i) => ({ w: x.w, tag: !x.k ? ('mark' as const) : same.has(i) ? ('same' as const) : ('diff' as const) }))
  return { a: tag(A, sa), b: tag(B, sb), common: sa.size, onlyA: n - sa.size, onlyB: m - sb.size, pre, suf, n, m }
}

// ---- Screen
export function Similarities() {
  const desk = useDevice() === 'desktop'
  const s = useSt()
  const tabs = [
    { id: 'discover', ar: 'اكتشف', icon: 'search' },
    { id: 'compare', ar: 'قارن', icon: 'layers' },
    { id: 'practice', ar: 'تدرّب', icon: 'sprout' },
    { id: 'connect', ar: 'اربط بالسورة', icon: 'path' },
  ] as const
  return (
    <Chrome>
      <div className={desk ? 'no-scrollbar h-full overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'}>
        {!desk && <MoreTabs />}
        <Head title="المتشابهات والروابط القرآنية" sub="تعرّف على الآيات المتقاربة في ألفاظها وقارن بينها كلمةً كلمة، ثم ثبّت حفظك بالتدريب." />
        <div role="tablist" aria-label="نوع الصلة" className="mb-4 grid grid-cols-2 rounded-full bg-night/[.05] p-1 text-[13.5px]">
          {([['textual', 'تشابه لفظي'], ['thematic', 'روابط موضوعية']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={s.lens === k} onClick={() => set({ lens: k })} className={`press h-10 rounded-full ${s.lens === k ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-muted'}`}>{l}</button>
          ))}
        </div>
        {s.lens === 'thematic' ? (
          <Empty icon="sparkle" title="لا توجد روابط موضوعية موثّقة بعد" body="الروابط الموضوعية (آيات تتناول المعنى نفسه بألفاظ مختلفة) تحتاج مصدرًا علميًا موثّقًا ومراجعة. لا نعرض أمثلة مخترعة ولا تصنيفًا آليًا لها، ولا نخلطها بالتشابه اللفظي." />
        ) : (
          <>
            <DataStatus />
            <div role="tablist" aria-label="أوضاع التشابه اللفظي" className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={s.tab === t.id} onClick={() => set({ tab: t.id })} className={`press flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] ${s.tab === t.id ? 'bg-night text-parchment' : 'bg-card text-night/75 ring-1 ring-line'}`}>
                  <Icon name={t.icon} size={15} />
                  {t.ar}
                  {(t.id === 'practice' || t.id === 'connect') && s.pairs.length > 0 && <span className="rounded-full bg-gold px-1.5 text-[10.5px] text-white">{toAr(s.pairs.length)}</span>}
                </button>
              ))}
            </div>
            {s.tab === 'discover' && <Discover />}
            {s.tab === 'compare' && <Compare />}
            {s.tab === 'practice' && <Practice />}
            {s.tab === 'connect' && <Connect />}
          </>
        )}
      </div>
    </Chrome>
  )
}

function DataStatus() {
  return (
    <div className="mb-4 rounded-[20px] bg-sky/[.07] p-4 ring-1 ring-sky/20" role="note">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold"><Icon name="shield" size={16} className="text-sky" />قاعدة المتشابهات الموثّقة: غير متوفرة بعد · {toAr(CURATED.length)} زوج</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-night/75">لا تحتوي المعاينة على أزواج متشابهات معتمدة. الأدوات أدناه تبحث في النص القرآني وتقارن الآيات التي تختارها <b className="font-semibold">مقارنةً لفظية آلية</b>؛ نتيجتها وصف للنص لا حكم علمي بأن الآيتين من المتشابهات.</p>
    </div>
  )
}

function Empty({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[26px] border border-dashed border-line bg-card/60 px-6 py-10 text-center" data-empty>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-night/[.05] text-muted"><Icon name={icon} size={24} /></span>
      <p className="mt-4 text-[16px] font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

function AyahText({ t, hafs, parts, size = 21 }: { t?: string; hafs: boolean; parts?: { w: string; tag: 'same' | 'diff' | 'mark' }[]; size?: number }) {
  return (
    <p className={`mf-text ${hafs ? '' : 'tanzil'}`} style={{ fontSize: size, lineHeight: 2.1, textAlign: 'right', textAlignLast: 'right' }}>
      {parts ? parts.map((x, i) => <span key={i}>{i > 0 && ' '}<span data-diff={x.tag} className={x.tag === 'diff' ? 'rounded-md bg-gold-soft px-0.5 ring-1 ring-gold/60' : ''}>{x.w}</span></span>) : t}
    </p>
  )
}

// ---- Discover: transparent word search across the whole Quran
function Discover() {
  const s = useSt()
  const open = useOpenInMushaf()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState(false)
  const [input, setInput] = useState(s.q)
  // The whole text is only fetched once the user actually searches.
  useEffect(() => {
    if (!s.q.trim() || rows) return
    let live = true
    setErr(false)
    loadCorpus().then((r) => live && setRows(r), () => live && setErr(true))
    return () => {
      live = false
    }
  }, [s.q, rows])
  const q = ` ${tokens(s.q).map((z) => z.k).filter(Boolean).join(' ')} `
  const hits = useMemo(() => {
    if (!rows || q.trim() === '') return []
    return rows.filter((r) => (s.where === 'start' ? r.sk.startsWith(q) : s.where === 'end' ? r.sk.endsWith(q) : r.sk.includes(q.trim())))
  }, [rows, q, s.where])
  const field = 'h-11 rounded-full bg-card px-4 text-[13.5px] ring-1 ring-line outline-none focus:ring-2 focus:ring-gold'
  return (
    <div>
      <form onSubmit={(e) => (e.preventDefault(), set({ q: input }))} className="flex flex-wrap gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب كلمات من آية، مثل: فبأي آلاء ربكما" aria-label="ابحث بألفاظ الآية" className={`${field} min-w-0 flex-1`} />
        <select value={s.where} onChange={(e) => set({ where: e.target.value as St['where'] })} aria-label="موضع اللفظ" className={field}>
          <option value="any">في أي موضع</option>
          <option value="start">في بداية الآية</option>
          <option value="end">في نهاية الآية</option>
        </select>
        <button type="submit" className="press h-11 rounded-full bg-night px-5 text-[13.5px] font-semibold text-parchment">ابحث</button>
      </form>
      <p className="mt-2 text-[11.5px] text-muted">مطابقة لفظية آلية على رسم الحروف (دون الحركات والهمزات)، في النص القرآني كاملًا ({rows ? `${toAr(rows.length)} آية` : 'يُحمَّل عند أول بحث'}).</p>
      <div className="mt-4">
        {err ? (
          <Empty icon="info" title="تعذّر تحميل النص القرآني" body="تحقّق من الاتصال ثم أعد فتح الشاشة." />
        ) : !s.q.trim() ? (
          <Empty icon="search" title="ابدأ بكلمات من آية" body="ستظهر الآيات التي تحتوي هذه الألفاظ نفسها، ويمكنك وضع أيّ اثنتين منها في المقارنة لترى الفروق كلمةً كلمة." />
        ) : !rows ? (
          <p className="py-6 text-center text-[13px] text-muted">جارٍ تحميل النص القرآني…</p>
        ) : hits.length === 0 ? (
          <Empty icon="search" title="لا توجد آية بهذه الألفاظ" body="جرّب كلمات أقل، أو غيّر موضع اللفظ." />
        ) : (
          <>
            <p className="mb-2 text-[12.5px] font-medium" role="status">{toAr(hits.length)} آية تحتوي هذا اللفظ{hits.length > 40 ? ' · تُعرض أول ٤٠' : ''}</p>
            <ul className="space-y-2" aria-label="نتائج البحث">
              {hits.slice(0, 40).map((r) => (
                <li key={`${r.s}:${r.a}`} className="rounded-[20px] bg-card p-4 ring-1 ring-line">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold">سورة {refAr(r)}</span>
                    <span className="text-[11.5px] text-muted">ص {toAr(pageOf(r.s, r.a))}</span>
                    <span className="ms-auto flex gap-1">
                      <button type="button" onClick={() => set({ slotA: r, tab: s.slotB ? 'compare' : s.tab })} className="press h-8 rounded-full bg-night/[.05] px-3 text-[12px]">ضعها في (أ)</button>
                      <button type="button" onClick={() => set({ slotB: r, tab: s.slotA ? 'compare' : s.tab })} className="press h-8 rounded-full bg-night/[.05] px-3 text-[12px]">ضعها في (ب)</button>
                      <button type="button" onClick={() => open(r.s, r.a)} aria-label={`افتح سورة ${refAr(r)} في المصحف`} className="press flex h-8 items-center gap-1 rounded-full bg-gold-soft px-3 text-[12px] font-medium"><Icon name="book" size={13} />المصحف</button>
                    </span>
                  </div>
                  <AyahText t={r.t} hafs={r.hafs} size={19} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

// ---- Compare: side by side with highlighted word differences
function RefPicker({ label, r, onPick }: { label: string; r: Ref | null; onPick: (r: Ref) => void }) {
  const s0 = r?.s ?? 1
  const field = 'h-9 rounded-full bg-night/[.04] px-2.5 text-[12.5px] ring-1 ring-line'
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
      <span className="font-semibold text-night">{label}</span>
      <select aria-label={`سورة ${label}`} value={s0} onChange={(e) => onPick({ s: Number(e.target.value), a: 1 })} className={`${field} max-w-[150px]`}>
        {SURAHS.map((x) => <option key={x.n} value={x.n}>{toAr(x.n)}. {x.ar}</option>)}
      </select>
      <input aria-label={`آية ${label}`} type="number" min={1} max={surah(s0).ayat} value={r?.a ?? ''} placeholder="آية" onChange={(e) => onPick({ s: s0, a: Math.min(surah(s0).ayat, Math.max(1, Number(e.target.value) || 1)) })} className={`${field} w-20 text-center`} />
    </div>
  )
}

function Compare() {
  const s = useSt()
  const desk = useDevice() === 'desktop'
  const open = useOpenInMushaf()
  const A = useAyah(s.slotA)
  const B = useAyah(s.slotB)
  const d = A && B ? diff(A.t, B.t) : null
  const same = s.slotA && s.slotB && s.slotA.s === s.slotB.s && s.slotA.a === s.slotB.a
  const linked = s.slotA && s.slotB && s.pairs.some((p) => p.a.s === s.slotA!.s && p.a.a === s.slotA!.a && p.b.s === s.slotB!.s && p.b.a === s.slotB!.a)
  const card = (k: 'A' | 'B', r: Ref | null, t: typeof A, parts?: ReturnType<typeof diff>['a']) => (
    <section className="rounded-[24px] bg-card p-4 ring-1 ring-line" aria-label={k === 'A' ? 'الآية (أ)' : 'الآية (ب)'}>
      <RefPicker label={k === 'A' ? '(أ)' : '(ب)'} r={r} onPick={(x) => set(k === 'A' ? { slotA: x } : { slotB: x })} />
      {r && t ? (
        <>
          <div className="mf-paper mt-3 rounded-[18px] p-4"><AyahText hafs={t.hafs} parts={parts} t={t.t} /></div>
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <span className="font-semibold" data-ref>سورة {refAr(r)}</span>
            <span className="text-muted">ص {toAr(pageOf(r.s, r.a))}</span>
            <button type="button" onClick={() => open(r.s, r.a)} className="press ms-auto flex h-8 items-center gap-1 rounded-full bg-gold-soft px-3 font-medium"><Icon name="book" size={13} />افتح في المصحف</button>
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-[18px] bg-night/[.03] p-6 text-center text-[12.5px] text-muted">اختر سورة ورقم آية، أو أضفها من «اكتشف».</p>
      )}
    </section>
  )
  return (
    <div>
      <div className={`grid gap-3 ${desk ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {card('A', s.slotA, A, d?.a)}
        {card('B', s.slotB, B, d?.b)}
      </div>
      {d && !same && (
        <section className="mt-4 rounded-[24px] bg-card p-5 ring-1 ring-line" aria-label="نتيجة المقارنة">
          <div className="flex flex-wrap gap-2 text-[12.5px]">
            <span className="rounded-full bg-night/[.05] px-3 py-1.5">كلمات مشتركة: <b>{toAr(d.common)}</b></span>
            <span className="rounded-full bg-gold-soft px-3 py-1.5">مختلفة في (أ): <b>{toAr(d.onlyA)}</b></span>
            <span className="rounded-full bg-gold-soft px-3 py-1.5">مختلفة في (ب): <b>{toAr(d.onlyB)}</b></span>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed" data-explain>
            {d.pre > 0 ? `تبدأ الآيتان بالكلمات نفسها (${toAr(d.pre)} ${d.pre > 2 && d.pre < 11 ? 'كلمات' : 'كلمة'}). ` : 'تختلف بداية الآيتين. '}
            {d.suf > 0 ? `وتنتهيان بالكلمات نفسها (${toAr(d.suf)} ${d.suf > 2 && d.suf < 11 ? 'كلمات' : 'كلمة'}). ` : 'وتختلف نهايتهما. '}
            {d.onlyA + d.onlyB > 0 ? 'الكلمات المظلّلة هي مواضع الاختلاف.' : 'لا يوجد اختلاف في رسم الكلمات.'}
          </p>
          <p className="mt-1 text-[11.5px] text-muted">وصف آلي للتطابق اللفظي في الرسم، وليس حكمًا علميًا بأن الآيتين من المتشابهات.</p>
          <button type="button" disabled={!!linked} onClick={() => set({ pairs: [...s.pairs, { a: s.slotA!, b: s.slotB! }] })} className="press mt-4 flex h-11 items-center gap-2 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment disabled:opacity-50">
            <Icon name={linked ? 'check' : 'plus'} size={16} />
            {linked ? 'مرتبطة بمقطع حفظك' : 'اربطها بمقطع حفظك للتدريب'}
          </button>
          <p className="mt-1.5 text-[11px] text-muted">الربط محفوظ في هذه الجلسة فقط (معاينة).</p>
        </section>
      )}
      {same && <p className="mt-3 text-center text-[12.5px] text-muted">اختر آيتين مختلفتين للمقارنة.</p>}
    </div>
  )
}

// ---- Practice: fill the differing word (only from pairs the user linked)
function usePairTexts(pairs: Pair[]) {
  const [m, setM] = useState<Record<string, { t: string; hafs: boolean }>>({})
  useEffect(() => {
    let live = true
    const need = [...new Set(pairs.flatMap((p) => [p.a.s, p.b.s]))]
    Promise.all(need.map((n) => loadMushaf(n).then((r) => [n, r] as const))).then((all) => {
      if (!live) return
      const out: Record<string, { t: string; hafs: boolean }> = {}
      for (const p of pairs) for (const r of [p.a, p.b]) out[`${r.s}:${r.a}`] = { t: all.find((x) => x[0] === r.s)![1].ayat[r.a - 1], hafs: all.find((x) => x[0] === r.s)![1].hafs }
      setM(out)
    })
    return () => {
      live = false
    }
  }, [pairs])
  return m
}

function Progress({ i, n, ok }: { i: number; n: number; ok: number }) {
  return (
    <div className="mb-4 flex items-center gap-3" aria-label={`السؤال ${toAr(Math.min(i + 1, n))} من ${toAr(n)}`}>
      <span className="flex flex-1 gap-1">{Array.from({ length: n }, (_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < i ? 'bg-leaf' : k === i ? 'bg-gold' : 'bg-night/10'}`} />)}</span>
      <span className="text-[12px] text-muted">{toAr(Math.min(i + 1, n))}/{toAr(n)} · أصبت {toAr(ok)}</span>
    </div>
  )
}

function Practice() {
  const s = useSt()
  const texts = usePairTexts(s.pairs)
  const qs = useMemo(() => {
    const out: { pair: Pair; parts: ReturnType<typeof diff>['a']; at: number; right: string; wrong: string; hafs: boolean }[] = []
    for (const p of s.pairs) {
      const A = texts[`${p.a.s}:${p.a.a}`]
      const B = texts[`${p.b.s}:${p.b.a}`]
      if (!A || !B) continue
      const d = diff(A.t, B.t)
      const at = d.a.findIndex((x) => x.tag === 'diff')
      const wrong = d.b.find((x) => x.tag === 'diff')?.w
      if (at >= 0 && wrong) out.push({ pair: p, parts: d.a, at, right: d.a[at].w, wrong, hafs: A.hafs })
    }
    return out
  }, [s.pairs, texts])
  const [i, setI] = useState(0)
  const [ok, setOk] = useState(0)
  const [pick, setPick] = useState<string | null>(null)
  if (s.pairs.length === 0) return <Empty icon="sprout" title="لا توجد أزواج للتدريب بعد" body="قارن آيتين في «قارن» ثم اربطهما بمقطع حفظك، وسيظهر هنا تدريب على الكلمة المختلفة." action={<button type="button" onClick={() => set({ tab: 'compare' })} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">اذهب إلى المقارنة</button>} />
  if (qs.length === 0) return <Empty icon="sprout" title="لا يوجد اختلاف في الكلمات" body="الأزواج المرتبطة لا تختلف في رسم كلماتها، فلا يوجد ما نتدرّب عليه." />
  if (i >= qs.length)
    return (
      <div className="rounded-[26px] bg-card p-8 text-center ring-1 ring-line" role="status">
        <p className="text-[18px] font-semibold">أحسنت، أتممت التدريب</p>
        <p className="mt-1 text-[13px] text-muted">أصبت {toAr(ok)} من {toAr(qs.length)}. كرّر متى شئت؛ لا تُحسب أخطاء ولا تُخصم نقاط.</p>
        <button type="button" onClick={() => (setI(0), setOk(0), setPick(null))} className="press mt-4 h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">أعد التدريب</button>
      </div>
    )
  const q = qs[i]
  const opts = [q.right, q.wrong].sort((x, y) => skel(x).localeCompare(skel(y)))
  return (
    <div className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <Progress i={i} n={qs.length} ok={ok} />
      <p className="mb-2 text-[13px] font-semibold">أي كلمة تكمل الآية في سورة {refAr(q.pair.a)}؟</p>
      <div className="mf-paper rounded-[18px] p-4">
        <p className={`mf-text ${q.hafs ? '' : 'tanzil'}`} style={{ fontSize: 21, lineHeight: 2.1, textAlign: 'right', textAlignLast: 'right' }}>
          {q.parts.map((x, k) => <span key={k}>{k > 0 && ' '}{k === q.at ? <span data-blank className="inline-block min-w-16 rounded-md border-b-2 border-dashed border-gold px-1 text-center">{pick ? (pick === q.right ? q.right : '؟') : '…'}</span> : x.w}</span>)}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <button key={o} type="button" disabled={!!pick} onClick={() => (setPick(o), o === q.right && setOk(ok + 1))} className={`press mf-text h-14 rounded-[16px] text-[20px] ring-1 ${pick ? (o === q.right ? 'bg-leaf/12 ring-leaf' : o === pick ? 'bg-night/[.04] ring-line' : 'ring-line') : 'bg-night/[.03] ring-line hover:ring-gold'}`}>{o}</button>
        ))}
      </div>
      {pick && (
        <div className="mt-3 flex items-center gap-2">
          <p className="flex-1 text-[12.5px]">{pick === q.right ? 'أحسنت.' : `ليست هذه؛ «${pick}» في سورة ${refAr(q.pair.b)}.`}</p>
          <button type="button" onClick={() => (setI(i + 1), setPick(null))} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">التالي</button>
        </div>
      )}
    </div>
  )
}

// ---- Connect: which surah does this verse belong to?
function Connect() {
  const s = useSt()
  const texts = usePairTexts(s.pairs)
  const qs = useMemo(() => s.pairs.flatMap((p, k) => [k % 2 ? p.b : p.a, k % 2 ? p.a : p.b].map((r) => ({ r, other: r === p.a ? p.b : p.a }))).filter((x) => texts[`${x.r.s}:${x.r.a}`] && x.r.s !== x.other.s), [s.pairs, texts])
  const [i, setI] = useState(0)
  const [ok, setOk] = useState(0)
  const [pick, setPick] = useState<number | null>(null)
  if (s.pairs.length === 0) return <Empty icon="path" title="لا توجد أزواج للربط بعد" body="بعد ربط آيتين من سورتين مختلفتين في «قارن»، تدرّب هنا على تذكّر أي آية تنتمي لأي سورة." action={<button type="button" onClick={() => set({ tab: 'compare' })} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">اذهب إلى المقارنة</button>} />
  if (qs.length === 0) return <Empty icon="path" title="الأزواج من السورة نفسها" body="اربط آيتين من سورتين مختلفتين ليظهر تدريب الربط بالسورة." />
  if (i >= qs.length)
    return (
      <div className="rounded-[26px] bg-card p-8 text-center ring-1 ring-line" role="status">
        <p className="text-[18px] font-semibold">بارك الله فيك</p>
        <p className="mt-1 text-[13px] text-muted">ربطت {toAr(ok)} من {toAr(qs.length)} آية بسورتها الصحيحة.</p>
        <button type="button" onClick={() => (setI(0), setOk(0), setPick(null))} className="press mt-4 h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">أعد</button>
      </div>
    )
  const q = qs[i]
  const t = texts[`${q.r.s}:${q.r.a}`]
  const opts = [q.r.s, q.other.s].sort((x, y) => x - y)
  return (
    <div className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <Progress i={i} n={qs.length} ok={ok} />
      <p className="mb-2 text-[13px] font-semibold">في أي سورة هذه الآية؟</p>
      <div className="mf-paper rounded-[18px] p-4"><AyahText t={t.t} hafs={t.hafs} /></div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {opts.map((n) => (
          <button key={n} type="button" disabled={pick !== null} onClick={() => (setPick(n), n === q.r.s && setOk(ok + 1))} className={`press h-12 rounded-[16px] text-[15px] font-semibold ring-1 ${pick !== null ? (n === q.r.s ? 'bg-leaf/12 ring-leaf' : 'ring-line') : 'bg-night/[.03] ring-line hover:ring-gold'}`}>سورة {surah(n).ar}</button>
        ))}
      </div>
      {pick !== null && (
        <div className="mt-3 flex items-center gap-2">
          <p className="flex-1 text-[12.5px]">{pick === q.r.s ? 'أحسنت.' : `هذه الآية من سورة ${refAr(q.r)}.`}</p>
          <button type="button" onClick={() => (setI(i + 1), setPick(null))} className="press h-10 rounded-full bg-night px-5 text-[13px] font-semibold text-parchment">التالي</button>
        </div>
      )}
    </div>
  )
}
