// رحلتك اليوم — unified home dashboard (design preview).
import { useContext, useEffect, useState, type ReactNode } from 'react'
import { MushafCtx } from './mushaf'
import { navTo } from '../../mushaf/page'
import { Chrome, Demo, Icon, toAr, useDevice, useProto } from '../core'
import { JUZ_INFO, azkarTitle, timeOfDay, weekLog } from '../data'
import { weekOrder } from '../../../components/PlanParts'
import { fromGIndex, loadMushaf, surah } from '../../../lib/quran'

function useAyahOfDay() {
  const d = new Date()
  const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5)
  const [s, a] = fromGIndex(((day * 131) % 6236) + 1)
  const [t, setT] = useState<{ text: string; hafs: boolean } | null>(null)
  useEffect(() => {
    loadMushaf(s).then((r) => setT({ text: r.ayat[a - 1], hafs: r.hafs }))
  }, [s, a])
  return { s, a, t }
}

function Ring({ v, color, size = 64, children }: { v: number; color: string; size?: number; children: ReactNode }) {
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="5" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} /></svg>
      {children}
    </span>
  )
}

export function HomeDashboard() {
  const device = useDevice()
  const { go } = useProto()
  const mushaf = useContext(MushafCtx)
  const today = weekLog(new Date().getDay(), weekOrder('ar')).find((x) => x.today)!
  const qDone = today.tasks.reduce((n, t) => n + Math.min(t.done, t.total), 0)
  const qTotal = today.tasks.reduce((n, t) => n + t.total, 0)
  const now = timeOfDay()
  const aod = useAyahOfDay()
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const h = new Date().getHours()
  const greet = h < 12 ? 'صباح الخير' : h < 18 ? 'طاب يومك' : 'مساء الخير'
  const desk = device === 'desktop'

  const journeys = [
    { id: 'quran', title: 'رحلة القرآن', icon: 'book', v: qTotal ? qDone / qTotal : 0, label: qTotal ? `${toAr(qDone)} من ${toAr(qTotal)}` : 'يوم راحة', color: 'var(--color-leaf)', go: () => go('ayah') },
    { id: 'azkar', title: 'رحلة الأذكار', icon: now === 'morning' ? 'sun' : 'moon', v: 3 / 8, label: '٣ من ٨', color: 'var(--color-gold)', go: () => go('azkar-list', now) },
    { id: 'tadabbur', title: 'رحلة التدبّر', icon: 'sparkle', v: 0, label: 'لم تبدأ', color: 'var(--color-sky)', go: () => go('ayah') },
  ]

  const hero = (
    <header className={`hero-fade relative text-white ${desk ? 'rounded-[32px] px-10 pb-28 pt-8' : 'px-5 pb-24 pt-14'}`}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12.5px] backdrop-blur"><Icon name="calendar" size={14} />{hijri}</span>
        <span className="ms-auto"><Demo className="bg-white/20 text-white" /></span>
      </div>
      <p className="mt-6 text-[15px] text-white/80">{greet}، مريم</p>
      <h1 className={`mt-1.5 font-bold leading-[1.3] ${desk ? 'text-[2.2rem]' : 'text-[1.6rem]'}`}>رحلتك اليوم</h1>
      <p className="mt-1 text-[14px] text-white/80">ثلاث خطوات هادئة: قرآن، وذكر، وتدبّر.</p>
    </header>
  )

  const trio = (
    <div className={`relative z-10 grid grid-cols-3 gap-2 rounded-[28px] bg-card p-3 shadow-[0_24px_50px_-28px_rgba(16,24,40,.5)] ring-1 ring-line ${desk ? '-mt-20 mx-6' : '-mt-16 mx-5'}`}>
      {journeys.map((j) => (
        <button key={j.id} type="button" onClick={j.go} className="press flex flex-col items-center gap-2 rounded-[20px] px-1 py-3 hover:bg-night/[.03]">
          <Ring v={j.v} color={j.color} size={desk ? 72 : 60}><Icon name={j.icon} size={desk ? 24 : 20} /></Ring>
          <span className="text-[13px] font-semibold">{j.title}</span>
          <span className="text-[11.5px] text-muted">{j.label}</span>
        </button>
      ))}
    </div>
  )

  const quranCard = (
    <Card title="رحلة القرآن" icon="book" action={<Link onClick={() => go('week')}>خطة الأسبوع</Link>}>
      <ul className="space-y-3">
        {today.tasks.length === 0 && <li className="text-[13px] text-muted">اليوم يوم راحة في خطتك.</li>}
        {today.tasks.map((t) => (
          <li key={t.plan.kind} className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${t.done >= t.total ? 'bg-leaf/12 text-leaf' : 'bg-gold-soft text-gold'}`}><Icon name={t.done >= t.total ? 'check' : t.plan.kind === 'hifz' ? 'sprout' : t.plan.kind === 'revision' ? 'repeat' : 'book'} size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium">{t.plan.kind === 'hifz' ? 'حفظ' : t.plan.kind === 'revision' ? 'مراجعة مستحقة' : 'ورد القراءة'} <span className="text-muted">· {toAr(t.done)}/{toAr(t.total)} {t.plan.unit}</span></p>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full" style={{ width: `${(t.done / t.total) * 100}%`, background: t.done >= t.total ? 'var(--color-leaf)' : 'var(--color-gold)' }} /></span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => go('ayah')} className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-night text-[13px] font-semibold text-parchment"><Icon name="sprout" size={16} />تابع الحفظ</button>
        <button type="button" onClick={() => (mushaf.set({ stage: 'reader', nav: navTo(mushaf.s.nav.pg) }), go('mushaf'))} className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-gold-soft text-[13px] font-semibold"><Icon name="book" size={16} />تابع القراءة في المصحف</button>
      </div>
      <p className="mt-3 text-[11.5px] text-muted">آخر قراءة: سورة الكهف · ص ٢٩٥ (تجريبي)</p>
    </Card>
  )

  const azkarCard = (
    <Card title="أذكار اليوم" icon={now === 'morning' ? 'sun' : 'moon'} action={<Demo />}>
      <button type="button" onClick={() => go('azkar-list', now)} className="press flex w-full items-center gap-3 rounded-[18px] bg-gold-soft/50 p-3.5 text-start">
        <Ring v={3 / 8} color="var(--color-gold)" size={48}><span className="text-[11px] font-bold">٣/٨</span></Ring>
        <span className="flex-1"><span className="block text-[14px] font-semibold">{azkarTitle(now)}</span><span className="block text-[12px] text-muted">بحسب وقتك الآن</span></span>
        <Icon name="chevron" size={16} className="rotate-180 text-muted" />
      </button>
      <button type="button" onClick={() => go('azkar-list', now === 'morning' ? 'evening' : 'morning')} className="press mt-2 flex w-full items-center justify-between rounded-[16px] px-3.5 py-2.5 text-[13px] text-muted hover:bg-night/[.03]">
        {azkarTitle(now === 'morning' ? 'evening' : 'morning')}<span>{now === 'morning' ? 'لاحقًا' : 'غدًا'}</span>
      </button>
    </Card>
  )

  const reflectCard = (
    <Card title="آية للتدبّر" icon="sparkle">
      <div className="mf-paper rounded-[18px] p-4">
        {aod.t ? <p className={`mf-text ${aod.t.hafs ? '' : 'tanzil'} line-clamp-4`} style={{ fontSize: 20, lineHeight: 2.05, textAlignLast: 'center' }}>{aod.t.text} <span className="mf-num">{toAr(aod.a)}</span></p> : <div className="h-16 animate-pulse rounded-xl bg-night/5" />}
        <p className="mt-1 text-center text-[11.5px] text-[var(--mf-ink-soft)]">سورة {surah(aod.s).ar} · {toAr(aod.a)}</p>
      </div>
      <button type="button" onClick={() => go('ayah')} className="press mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-night/[.05] text-[13px] font-semibold"><Icon name="note" size={16} />اكتب تأمّلك</button>
    </Card>
  )

  const recent = (
    <Card title="إنجازات قريبة" icon="star" action={<Link onClick={() => go('library')}>المكتبة</Link>}>
      <ul className="space-y-2.5">
        {JUZ_INFO.filter((j) => j.status !== 'idle').slice(-2).reverse().map((j) => (
          <li key={j.j}>
            <button type="button" onClick={() => go('map')} className="press flex w-full items-center gap-3 rounded-[16px] p-2 text-start hover:bg-night/[.03]">
              <span className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${j.status === 'done' ? 'bg-leaf/12 text-leaf' : 'bg-gold-soft text-gold'}`}><Icon name={j.status === 'done' ? 'check' : 'path'} size={18} /></span>
              <span className="flex-1"><span className="block text-[13.5px] font-medium">{j.status === 'done' ? `أتممت حفظ الجزء ${toAr(j.j)}` : `أُضيئت محطة الجزء ${toAr(j.j)}`}</span><span className="block text-[11.5px] text-muted">{toAr(j.memorised)} من {toAr(j.total)} آية</span></span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )

  if (desk)
    return (
      <Chrome>
        <div className="mx-auto max-w-[1000px] px-8 py-8">
          {hero}
          {trio}
          <div className="mt-8 grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">{quranCard}{reflectCard}</div>
            <div className="space-y-5">{azkarCard}{recent}</div>
          </div>
        </div>
      </Chrome>
    )
  return (
    <Chrome bare>
      {hero}
      {trio}
      <div className="space-y-4 px-5 pt-5">{quranCard}{azkarCard}{reflectCard}{recent}</div>
    </Chrome>
  )
}

function Card({ title, icon, action, children }: { title: string; icon: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[26px] bg-card p-5 ring-1 ring-line">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name={icon} size={16} /></span>
        <h2 className="flex-1 text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Link({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="text-[12.5px] font-medium text-gold hover:underline">{children}</button>
}
