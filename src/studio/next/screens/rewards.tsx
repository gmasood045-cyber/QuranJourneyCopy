// المكافآت والإنجازات — adult and children's rewards (design preview).
// Every achievement is computed from the preview's DEMO records (data.ts), using
// the same rules a real implementation must follow:
//   • only explicitly confirmed, mastered memorisation counts as memorisation
//   • reading, listening, Tafsir, reflection or browsing never count as memorisation
//   • revision achievements need completed revision tasks
//   • nothing is ever deducted, there are no streak penalties and no leaderboards
// Nothing here touches the app store or a real account.
import { useState } from 'react'
import { Chrome, Demo, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { DEMO_MEMORISED, JUZ_AR, JUZ_INFO, KIDS_ROOMS, TOTAL_MEMORISED, surahMemorised, weekLog } from '../data'
import { weekOrder } from '../../../components/PlanParts'
import { SURAHS, surah } from '../../../lib/quran'

type Badge = { id: string; group: string; ar: string; icon: string; earned: boolean; progress: number; evidence: string }
const ayatLabel = (n: number) => `${toAr(n)} ${n >= 3 && n <= 10 ? 'آيات' : 'آية'}`
const daysLabel = (n: number) => (n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : `${toAr(n)} ${n >= 3 && n <= 10 ? 'أيام' : 'يوم'}`)

// ---- Adult rules, evaluated against the demo records
function adultStats() {
  const week = weekLog(new Date().getDay(), weekOrder('ar'))
  const sofar = week.filter((d) => d.past || d.today)
  const revDays = sofar.filter((d) => d.tasks.some((t) => t.plan.kind === 'revision' && t.done >= t.total))
  const revPlanned = sofar.filter((d) => d.tasks.some((t) => t.plan.kind === 'revision'))
  const today = week.find((d) => d.today)!
  const todayRev = today.tasks.find((t) => t.plan.kind === 'revision')
  const present = sofar.filter((d) => d.tasks.some((t) => t.done > 0))
  const surahsDone = SURAHS.filter((x) => surahMemorised(x.n) === x.ayat)
  const m = (n: number) => ({ earned: TOTAL_MEMORISED >= n, progress: Math.min(1, TOTAL_MEMORISED / n) })
  const juz: Badge[] = JUZ_INFO.filter((j) => j.status !== 'idle').map((j) => ({
    id: `juz-${j.j}`,
    group: 'juz',
    ar: `الجزء ${JUZ_AR[j.j - 1]}`,
    icon: 'book',
    earned: j.status === 'done',
    progress: j.memorised / j.total,
    evidence: `${toAr(j.memorised)} من ${toAr(j.total)} آية محفوظة بتأكيد`,
  }))
  const badges: Badge[] = [
    { id: 'first-surah', group: 'hifz', ar: 'أول سورة كاملة', icon: 'sprout', earned: surahsDone.length > 0, progress: surahsDone.length > 0 ? 1 : 0, evidence: surahsDone.length ? `${toAr(surahsDone.length)} سورة محفوظة كاملة` : 'لا توجد سورة مكتملة بعد' },
    { id: 'h100', group: 'hifz', ar: '١٠٠ آية محفوظة', icon: 'star', ...m(100), evidence: `${toAr(TOTAL_MEMORISED)} آية مؤكّدة` },
    { id: 'h500', group: 'hifz', ar: '٥٠٠ آية محفوظة', icon: 'star', ...m(500), evidence: `${toAr(TOTAL_MEMORISED)} من ٥٠٠` },
    { id: 'h1000', group: 'hifz', ar: '١٠٠٠ آية محفوظة', icon: 'star', ...m(1000), evidence: `${toAr(TOTAL_MEMORISED)} من ١٠٠٠` },
    { id: 'mulk', group: 'hifz', ar: 'سورة الملك كاملة', icon: 'shield', earned: surahMemorised(67) === 30, progress: surahMemorised(67) / 30, evidence: `${toAr(surahMemorised(67))} من ٣٠ آية` },
    ...juz,
    { id: 'rev-today', group: 'revision', ar: 'أتممت مراجعة اليوم', icon: 'repeat', earned: !!todayRev && todayRev.done >= todayRev.total, progress: todayRev ? Math.min(1, todayRev.done / todayRev.total) : 0, evidence: todayRev ? `${toAr(todayRev.done)} من ${toAr(todayRev.total)} آية مراجعة اليوم` : 'لا مراجعة في خطة اليوم' },
    { id: 'rev-3', group: 'revision', ar: 'ثلاثة أيام مراجعة هذا الأسبوع', icon: 'repeat', earned: revDays.length >= 3, progress: Math.min(1, revDays.length / 3), evidence: `${daysLabel(revDays.length)} أُتمّت فيها المراجعة` },
    { id: 'rev-week', group: 'revision', ar: 'مراجعة الأسبوع كما خطّطت', icon: 'calendar', earned: revPlanned.length > 0 && revDays.length === revPlanned.length, progress: revPlanned.length ? revDays.length / revPlanned.length : 0, evidence: `${toAr(revDays.length)} من ${toAr(revPlanned.length)} أيام مراجعة حتى اليوم` },
    { id: 'present-3', group: 'consistency', ar: 'حاضر ثلاثة أيام هذا الأسبوع', icon: 'sun', earned: present.length >= 3, progress: Math.min(1, present.length / 3), evidence: `حضرت ${daysLabel(present.length)} · الأيام الأخرى لا تُنقص شيئًا` },
  ]
  return { badges, revDays: revDays.length }
}
const GROUPS: Record<string, string> = { hifz: 'محطات الحفظ', juz: 'الأجزاء', revision: 'المراجعة', consistency: 'الثبات' }
const ranges = () => DEMO_MEMORISED.map(([a, b]) => `${surah(a[0]).ar} ${toAr(a[1])}–${surah(b[0]).ar} ${toAr(b[1])}`).join('، ')

export function Rewards() {
  const { nav, go } = useProto()
  const kids = nav.param === 'kids'
  const desk = useDevice() === 'desktop'
  const toggle = (
    <div role="tablist" aria-label="التجربة" className="grid w-full max-w-[320px] grid-cols-2 rounded-full bg-night/[.05] p-1 text-[13px]">
      {([['adult', 'الكبار'], ['kids', 'الأطفال']] as const).map(([k, l]) => (
        <button key={k} type="button" role="tab" aria-selected={(k === 'kids') === kids} onClick={() => go('rewards', k)} className={`press h-9 rounded-full ${(k === 'kids') === kids ? 'bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-muted'}`}>{l}</button>
      ))}
    </div>
  )
  return (
    <Chrome>
      <div className={desk ? 'no-scrollbar h-full overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'}>
        {!desk && <MoreTabs />}
        <Head title="المكافآت والإنجازات" sub={kids ? 'نجوم وأوسمة لكل خطوة تعلّمتها حقًّا، بلا مقارنة ولا خسارة.' : 'احتفاء هادئ بما أتممته فعلًا: حفظ مؤكَّد، ومراجعة مكتملة، وثبات على خطتك.'} action={<Demo />} />
        <div className="mb-5">{toggle}</div>
        {kids ? <KidsRewards /> : <AdultRewards />}
      </div>
    </Chrome>
  )
}

// ---- Adult
function AdultRewards() {
  const desk = useDevice() === 'desktop'
  const { go } = useProto()
  const { badges, revDays } = adultStats()
  const [open, setOpen] = useState<Badge | null>(null)
  const earned = badges.filter((b) => b.earned)
  const juzDone = JUZ_INFO.filter((j) => j.status === 'done').length
  return (
    <div className="space-y-5" data-mode="adult">
      <div className={`grid gap-3 ${desk ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <Summary icon="sprout" v={ayatLabel(TOTAL_MEMORISED)} l="محفوظة بتأكيد" id="memorised" />
        <Summary icon="book" v={`${toAr(juzDone)} من ٣٠`} l="أجزاء مكتملة" />
        <Summary icon="star" v={toAr(earned.length)} l="إنجازات نلتها" />
        <Summary icon="repeat" v={daysLabel(revDays)} l="مراجعة مكتملة هذا الأسبوع" />
      </div>
      <p className="text-[12px] leading-relaxed text-muted">محسوبة من سجلات الحفظ المؤكَّدة التجريبية ({ranges()}) وسجل خطة الأسبوع التجريبي.</p>

      {open && (
        <div role="dialog" aria-label="احتفاء بالإنجاز" className="flex items-center gap-4 rounded-[26px] bg-gold-soft/60 p-5 ring-1 ring-gold/30">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-white"><Icon name={open.icon} size={24} /></span>
          <div className="flex-1">
            <p className="text-[16px] font-semibold">{open.earned ? `ما شاء الله · ${open.ar}` : `في الطريق إلى: ${open.ar}`}</p>
            <p className="text-[12.5px] text-night/75">{open.evidence}{open.earned ? ' · بارك الله في وقتك وجهدك.' : ' · تقدّم بهدوء؛ كل آية تُتقنها تبقى لك.'}</p>
          </div>
          <button type="button" onClick={() => setOpen(null)} aria-label="إغلاق" className="press flex h-9 w-9 items-center justify-center rounded-full bg-card"><Icon name="x" size={15} /></button>
        </div>
      )}

      {Object.entries(GROUPS).map(([g, title]) => {
        const list = badges.filter((b) => b.group === g)
        if (!list.length) return null
        return (
          <section key={g} aria-label={title}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-[15px] font-semibold">{title}</h2>
              {g === 'juz' && <button type="button" onClick={() => go('library')} className="press ms-auto flex items-center gap-1 rounded-full px-3 py-1 text-[12px] text-muted hover:bg-night/[.04]"><Icon name="layers" size={14} />مكتبة إنجازاتي</button>}
            </div>
            <ul className={`grid gap-2.5 ${desk ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {list.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => setOpen(b)} data-earned={b.earned} className={`press flex w-full items-center gap-3 rounded-[20px] p-3.5 text-start ring-1 ${b.earned ? 'bg-card ring-gold/40' : 'bg-card/60 ring-line'}`}>
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${b.earned ? 'bg-gold text-white' : 'bg-night/[.05] text-muted'}`}><Icon name={b.earned ? b.icon : 'lock'} size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold">{b.ar}</span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-night/10"><span className={`block h-full rounded-full ${b.earned ? 'bg-gold' : 'bg-sage'}`} style={{ width: `${Math.round(b.progress * 100)}%` }} /></span>
                      <span className="mt-1 block truncate text-[11.5px] text-muted">{b.earned ? 'نلته' : 'في الطريق'} · {b.evidence}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <section aria-label="سجل الإنجازات" className="rounded-[26px] bg-card p-5 ring-1 ring-line">
        <h2 className="text-[15px] font-semibold">سجلّ ما نلته</h2>
        <p className="mb-3 text-[11.5px] text-muted">مرتّب حسب المحطة؛ لا تُعرض تواريخ لأن السجل التجريبي لا يحملها.</p>
        <ol className="relative space-y-3 border-s-2 border-gold/30 ps-4">
          {earned.map((b) => (
            <li key={b.id} className="relative">
              <span className="absolute -start-[23px] top-1 h-3 w-3 rounded-full bg-gold ring-4 ring-card" />
              <p className="text-[13.5px] font-medium">{b.ar}</p>
              <p className="text-[11.5px] text-muted">{b.evidence}</p>
            </li>
          ))}
        </ol>
      </section>

      <RulesLab />
    </div>
  )
}

function Summary({ icon, v, l, id }: { icon: string; v: string; l: string; id?: string }) {
  return (
    <div className="rounded-[22px] bg-card p-4 ring-1 ring-line" data-summary={id}>
      <Icon name={icon} size={18} className="text-gold" />
      <p className="mt-2 text-[20px] font-bold leading-none">{v}</p>
      <p className="mt-1 text-[12px] text-muted">{l}</p>
    </div>
  )
}

/** Interactive demonstration of the counting rules. */
function RulesLab() {
  const [hifz, setHifz] = useState(0)
  const [rev, setRev] = useState(0)
  const [log, setLog] = useState<{ ar: string; effect: string; counted: boolean }[]>([])
  const acts: { id: string; ar: string; icon: string; apply: () => { effect: string; counted: boolean } }[] = [
    { id: 'read', ar: 'قرأت صفحة', icon: 'book', apply: () => ({ effect: 'قراءة · لا تُحتسب حفظًا', counted: false }) },
    { id: 'listen', ar: 'استمعت لآية', icon: 'volume', apply: () => ({ effect: 'استماع · لا يُحتسب حفظًا', counted: false }) },
    { id: 'tafsir', ar: 'فتحت التفسير', icon: 'tafsir', apply: () => ({ effect: 'تفسير · لا يُحتسب حفظًا', counted: false }) },
    { id: 'reflect', ar: 'كتبت تأمّلًا', icon: 'note', apply: () => ({ effect: 'تدبّر · لا يُحتسب حفظًا', counted: false }) },
    { id: 'revise', ar: 'أكملت مهمة مراجعة', icon: 'repeat', apply: () => (setRev((x) => x + 1), { effect: '+١ مراجعة مكتملة', counted: true }) },
    { id: 'master', ar: 'أتقنت آية وأكّدت ذلك', icon: 'check', apply: () => (setHifz((x) => x + 1), { effect: '+١ آية محفوظة', counted: true }) },
  ]
  return (
    <section aria-label="كيف تُحتسب المكافآت" className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">كيف تُحتسب المكافآت؟ جرّب بنفسك</h2>
        <span className="rounded-full bg-night/[.05] px-3 py-1 text-[12px]" data-count="hifz">حفظ مؤكَّد: <b>+{toAr(hifz)}</b></span>
        <span className="rounded-full bg-night/[.05] px-3 py-1 text-[12px]" data-count="rev">مراجعة: <b>+{toAr(rev)}</b></span>
      </div>
      <ul className="mt-2 space-y-1 text-[12.5px] text-night/80">
        <li>• يُحتسب الحفظ فقط حين تؤكّد أنك أتقنت الآية.</li>
        <li>• القراءة والاستماع والتفسير والتدبّر عبادات نافعة، لكنها لا تُسجَّل حفظًا تلقائيًا.</li>
        <li>• لا يُخصم شيء أبدًا، ولا خسارة عند انقطاع يوم، ولا ترتيب بين المستخدمين.</li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {acts.map((a) => (
          <button key={a.id} type="button" data-act={a.id} onClick={() => { const r = a.apply(); setLog((l) => [{ ar: a.ar, ...r }, ...l].slice(0, 6)) }} className="press flex h-10 items-center gap-1.5 rounded-full bg-night/[.04] px-3.5 text-[12.5px] ring-1 ring-line hover:ring-gold/50"><Icon name={a.icon} size={15} />{a.ar}</button>
        ))}
        {log.length > 0 && <button type="button" onClick={() => (setLog([]), setHifz(0), setRev(0))} className="press h-10 rounded-full px-3 text-[12px] text-muted">مسح</button>}
      </div>
      {log.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label="سجل التجربة">
          {log.map((x, i) => <li key={i} className={`rounded-[12px] px-3 py-1.5 text-[12px] ${x.counted ? 'bg-leaf/10' : 'bg-night/[.03] text-muted'}`}>{x.ar} ← {x.effect}</li>)}
        </ul>
      )}
    </section>
  )
}

// ---- Kids
const STICKERS = [
  { ar: 'هلال', icon: 'moon', tile: 'bg-kid-3' },
  { ar: 'نجمة', icon: 'star', tile: 'bg-kid-2' },
  { ar: 'شمس', icon: 'sun', tile: 'bg-kid-2' },
  { ar: 'غرسة', icon: 'sprout', tile: 'bg-kid-1' },
  { ar: 'قلب', icon: 'heart', tile: 'bg-kid-4' },
  { ar: 'كتاب', icon: 'book', tile: 'bg-kid-5' },
  { ar: 'درع', icon: 'shield', tile: 'bg-kid-3' },
  { ar: 'بريق', icon: 'sparkle', tile: 'bg-kid-1' },
]
const PER_STICKER = 5
const THEMES = [
  { id: 'garden', ar: 'حديقة', tile: 'bg-kid-1', need: 0 },
  { id: 'sun', ar: 'شمسية', tile: 'bg-kid-2', need: 0 },
  { id: 'sky', ar: 'سماء', tile: 'bg-kid-3', need: 10 },
  { id: 'rose', ar: 'وردية', tile: 'bg-kid-4', need: 20 },
  { id: 'lilac', ar: 'بنفسجية', tile: 'bg-kid-5', need: 30 },
]
const TILES = ['bg-kid-1', 'bg-kid-2', 'bg-kid-3', 'bg-kid-4', 'bg-kid-5']

function KidsRewards() {
  const desk = useDevice() === 'desktop'
  const { go } = useProto()
  const stars = KIDS_ROOMS.reduce((n, r) => n + r.done, 0)
  const unlocked = Math.min(STICKERS.length, Math.floor(stars / PER_STICKER))
  const toNext = PER_STICKER - (stars % PER_STICKER)
  const [theme, setTheme] = useState('garden')
  const room = (id: string) => KIDS_ROOMS.find((r) => r.id === id)!
  const badges = [
    { ar: 'صديق الحروف', icon: 'letters', earned: room('letters').done >= 10, hint: `${toAr(room('letters').done)} حرفًا` },
    { ar: 'بطل الحركات', icon: 'sparkle', earned: room('harakat').done >= room('harakat').total, hint: `${toAr(room('harakat').done)} من ${toAr(room('harakat').total)}` },
    { ar: 'أول كلمة موصولة', icon: 'layers', earned: room('joining').done >= 1, hint: room('joining').done ? 'أحسنت' : 'قريبًا' },
    { ar: 'قارئ صغير', icon: 'book', earned: room('reading').done >= 1, hint: room('reading').done ? 'أحسنت' : 'قريبًا' },
    { ar: 'حافظ السور القصيرة', icon: 'heart', earned: room('surahs').done >= 3, hint: `${toAr(room('surahs').done)} سور أكّدها وليّ الأمر` },
  ]
  const t = THEMES.find((x) => x.id === theme)!
  return (
    <div className="space-y-5" data-mode="kids">
      <div className={`grid gap-4 ${desk ? 'grid-cols-[1.2fr_1fr]' : 'grid-cols-1'}`}>
        <section aria-label="نجومي" className="rounded-[30px] bg-kid-2 p-6 text-center">
          <p className="text-[14px] font-semibold">نجومي</p>
          <p className="mt-2 text-[54px] font-bold leading-none" data-stars={stars}>{toAr(stars)}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1" aria-hidden>{Array.from({ length: Math.min(stars, 30) }, (_, i) => <Icon key={i} name="star" size={16} fill className="text-gold" />)}</div>
          <p className="mt-3 text-[13px]">نجمة لكل درس أتممته. بقي {toAr(toNext)} {toNext > 2 ? 'نجوم' : 'نجمة'} لملصق جديد!</p>
        </section>
        <section aria-label="زيّن بيتك" className={`rounded-[30px] p-6 ${t.tile}`}>
          <p className="text-[14px] font-semibold">زيّن بيتك (اختياري)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {THEMES.map((x) => (
              <button key={x.id} type="button" disabled={stars < x.need} onClick={() => setTheme(x.id)} aria-pressed={theme === x.id} className={`press flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-2 text-[12.5px] ring-2 disabled:opacity-50 ${theme === x.id ? 'ring-night' : 'ring-transparent'}`}>
                <span className={`h-4 w-4 rounded-full ${x.tile} ring-1 ring-night/10`} />
                {x.ar}
                {stars < x.need && <span className="text-muted"> · {toAr(x.need)} نجمة</span>}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-night/70">زينة فقط؛ لا تغيّر الدروس ولا التقدّم.</p>
        </section>
      </div>

      <section aria-label="أوسمتي">
        <h2 className="mb-2 text-[15px] font-semibold">أوسمتي</h2>
        <ul className={`grid gap-3 ${desk ? 'grid-cols-5' : 'grid-cols-2'}`}>
          {badges.map((b, i) => (
            <li key={b.ar} data-earned={b.earned} className={`rounded-[24px] p-4 text-center ${b.earned ? TILES[i % 5] : 'bg-card/70 ring-1 ring-dashed ring-line'}`}>
              <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${b.earned ? 'bg-card text-gold' : 'bg-night/[.05] text-muted'}`}><Icon name={b.earned ? b.icon : 'lock'} size={24} /></span>
              <p className="mt-2 text-[13.5px] font-semibold">{b.ar}</p>
              <p className="text-[11.5px] text-muted">{b.earned ? 'ما شاء الله!' : 'قريبًا'} · {b.hint}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="مجموعة الملصقات" className="rounded-[30px] bg-card p-5 ring-1 ring-line">
        <h2 className="text-[15px] font-semibold">مجموعة ملصقاتي · {toAr(unlocked)} من {toAr(STICKERS.length)}</h2>
        <ul className={`mt-3 grid gap-2.5 ${desk ? 'grid-cols-8' : 'grid-cols-4'}`}>
          {STICKERS.map((x, i) => (
            <li key={x.ar} className={`flex aspect-square flex-col items-center justify-center rounded-[20px] ${i < unlocked ? x.tile : 'bg-night/[.04]'}`} data-unlocked={i < unlocked}>
              <Icon name={i < unlocked ? x.icon : 'lock'} size={i < unlocked ? 28 : 18} className={i < unlocked ? 'text-night' : 'text-muted/60'} />
              <span className="mt-1 text-[11px]">{i < unlocked ? x.ar : `${toAr((i + 1) * PER_STICKER)} نجمة`}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[26px] bg-card p-5 ring-1 ring-line" aria-label="لولي الأمر">
        <p className="text-[13.5px] font-semibold">لوليّ الأمر</p>
        <ul className="mt-2 space-y-1 text-[12.5px] text-night/80">
          <li>• النجمة تُمنح عند إتمام درس فعلًا، لا بمجرد فتحه أو الاستماع.</li>
          <li>• السورة القصيرة تُحسب محفوظة فقط حين تؤكّد أنت أن طفلك أتقنها.</li>
          <li>• لا تُسحب نجمة أبدًا، ولا مقارنة بين الأطفال.</li>
        </ul>
        <button type="button" onClick={() => go('kids')} className="press mt-3 flex h-10 items-center gap-1.5 rounded-full bg-night px-4 text-[12.5px] font-semibold text-parchment"><Icon name="home" size={15} />إلى عالم الأطفال</button>
      </section>
    </div>
  )
}
