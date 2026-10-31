// خريطة خطط الأسبوع — weekly roadmap (design preview). Mirrors the plan model
// in lib/plans (kind + study weekdays + daily units); a weekday that no plan
// studies on is an intentional rest day.
import { useState } from 'react'
import { Chrome, Demo, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { DEMO_PLANS, weekLog } from '../data'
import { Box, C, GlowDefs, S, STATUS_COLOR, SURFACE, kernel, tint, type Status } from '../iso'
import { weekOrder } from '../../../components/PlanParts'

const DAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const KIND = { hifz: { icon: 'sprout', ar: 'حفظ' }, revision: { icon: 'repeat', ar: 'مراجعة' }, reading: { icon: 'book', ar: 'قراءة' } } as const
type Day = ReturnType<typeof weekLog>[number]

const dayStatus = (d: Day): Status => (d.rest ? 'rest' : d.tasks.every((t) => t.done >= t.total) ? 'done' : d.tasks.some((t) => t.done > 0) ? 'progress' : 'idle')

export function WeekRoadmap() {
  const device = useDevice()
  const order = weekOrder('ar')
  const todayDow = new Date().getDay()
  const days = weekLog(todayDow, order)
  const [sel, setSel] = useState(todayDow)
  const d = days.find((x) => x.dow === sel)!
  const head = <Head title="خريطة خطط الأسبوع" sub="سبع محطات لأيامك. تُضاء المحطة حين تكتمل مهامها، وأيام الراحة جزء مقصود من خطتك." action={<Demo />} />
  if (device === 'desktop')
    return (
      <Chrome>
        <div className="flex h-full">
          <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-10 py-9">
            {head}
            <Plans />
            <Road days={days} sel={sel} onSel={setSel} wide />
          </div>
          <aside className="no-scrollbar w-[370px] shrink-0 overflow-y-auto border-s border-line/60 bg-card/50 p-6"><DayDetail d={d} /></aside>
        </div>
      </Chrome>
    )
  return (
    <Chrome>
      <div className="px-5 pb-8 pt-4">
        <MoreTabs />
        {head}
        <Road days={days} sel={sel} onSel={setSel} />
        <div className="mt-2 rounded-[26px] bg-card p-5 ring-1 ring-line"><DayDetail d={d} /></div>
      </div>
    </Chrome>
  )
}

function Plans() {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {DEMO_PLANS.map((p) => (
        <span key={p.kind} className="flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-[12.5px] ring-1 ring-line">
          <Icon name={KIND[p.kind].icon} size={15} className="text-gold" />
          <b className="font-semibold">{p.ar}</b>
          <span className="text-muted">· {toAr(p.daily)} {p.unit} · {toAr(p.days.length)} أيام</span>
        </span>
      ))}
    </div>
  )
}

function Road({ days, sel, onSel, wide = false }: { days: Day[]; sel: number; onSel: (d: number) => void; wide?: boolean }) {
  const W = wide ? 820 : 350
  const H = wide ? 330 : 760
  const k = kernel(0, 0)
  const pos = days.map((_, i) => {
    const X = wide ? W - 60 - i * ((W - 120) / 6) : i % 2 ? 105 : W - 105
    const Y = wide ? 150 + (i % 2 ? 70 : 0) : 70 + i * 100
    return { X, Y, x: (Y / S + X / C) / 2, y: (Y / S - X / C) / 2 }
  })
  const path = pos.map((p, i) => (i === 0 ? `M${p.X},${p.Y}` : `Q${(pos[i - 1].X + p.X) / 2},${wide ? (pos[i - 1].Y + p.Y) / 2 + (i % 2 ? -50 : 50) : (pos[i - 1].Y + p.Y) / 2} ${p.X},${p.Y}`)).join(' ')
  const P = wide ? 70 : 62
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="أيام الأسبوع">
      <GlowDefs id="wk" />
      <path d={path} fill="none" stroke="color-mix(in oklab, var(--color-line) 85%, var(--color-night) 6%)" strokeWidth={20} strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--color-card)" strokeWidth={14} strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--color-line)" strokeWidth={1.4} strokeDasharray="3 7" />
      {pos.map(({ x, y, X, Y }, i) => {
        const d = days[i]
        const st = dayStatus(d)
        const h = d.rest ? 8 : 14
        const f = st === 'idle' ? SURFACE : tint(STATUS_COLOR[st], st === 'rest' ? 0.45 : 0.6)
        const on = sel === d.dow
        return (
          <g key={d.dow} className="iso-hit" role="button" tabIndex={0} aria-pressed={on} aria-label={`${DAY_AR[d.dow]}${d.rest ? '، يوم راحة' : ''}`} onClick={() => onSel(d.dow)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSel(d.dow))}>
            {(st === 'done' || st === 'progress' || st === 'rest') && <ellipse className="iso-halo" cx={X} cy={Y} rx={P * 0.85} ry={P * 0.45} fill={STATUS_COLOR[st]} filter="url(#wk-bloom)" opacity={st === 'rest' ? 0.5 : undefined} />}
            <g className="iso-lift">
              <Box k={k} x={x - P / 2} y={y - P / 2} z={0} w={P} d={P} h={h} f={f} />
              {on && <polygon points={k.poly([[x - P / 2, y - P / 2, h], [x + P / 2, y - P / 2, h], [x + P / 2, y + P / 2, h], [x - P / 2, y + P / 2, h]])} fill="none" stroke="var(--color-night)" strokeWidth={1.6} />}
              {d.tasks.map((t, ti) => {
                const ts: Status = t.done >= t.total ? 'done' : t.done > 0 ? 'progress' : 'idle'
                const tx = x - P / 2 + 8 + ti * ((P - 16) / 3)
                return <Box key={ti} k={k} x={tx} y={y - 8} z={h} w={(P - 16) / 3 - 4} d={16} h={ts === 'idle' ? 3 : 6} f={ts === 'idle' ? SURFACE : tint(STATUS_COLOR[ts], 0.8)} />
              })}
              {d.rest && <path transform={`translate(${X - 9} ${Y - h - 22}) scale(0.75)`} d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="var(--color-sky)" strokeWidth={2} strokeLinejoin="round" />}
              <text x={X} y={Y + P * 0.62} textAnchor="middle" fontSize={12.5} fontWeight={d.today ? 800 : 600} fill={d.today ? 'var(--color-night)' : 'var(--color-muted)'}>{DAY_AR[d.dow]}</text>
              {d.today && (
                <g>
                  <rect x={X - 18} y={Y + P * 0.62 + 6} width={36} height={16} rx={8} fill="var(--color-night)" />
                  <text x={X} y={Y + P * 0.62 + 17.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--color-parchment)">اليوم</text>
                </g>
              )}
            </g>
          </g>
        )
      })}
    </svg>
  )
}

function DayDetail({ d }: { d: Day }) {
  const { go } = useProto()
  const st = dayStatus(d)
  if (d.rest)
    return (
      <div>
        <p className="text-[12px] text-muted">{d.today ? 'اليوم' : d.past ? 'مضى' : 'قادم'}</p>
        <h2 className="font-arabic-display text-[20px] font-bold">{DAY_AR[d.dow]}</h2>
        <div className="mt-4 rounded-[22px] bg-sky/10 p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky/15 text-sky"><Icon name="moon" size={22} /></span>
          <p className="mt-3 font-semibold">يوم راحة مقصود</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">لم تُحدَّد مهام لهذا اليوم في خططك. الراحة جزء من الاستمرار، ولا يُحسب يومًا فائتًا.</p>
        </div>
        <button type="button" onClick={() => go('ayah')} className="press mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-night/[.05] text-[13.5px] font-medium">
          <Icon name="sparkle" size={16} />تدبّر آية بلا التزام
        </button>
      </div>
    )
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-muted">{d.today ? 'اليوم' : d.past ? 'مضى' : 'قادم'}</p>
          <h2 className="font-arabic-display text-[20px] font-bold">{DAY_AR[d.dow]}</h2>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${st === 'done' ? 'bg-leaf/10 text-leaf' : st === 'progress' ? 'bg-gold-soft' : 'bg-night/[.05] text-muted'}`}>{st === 'done' ? 'اكتملت مهامه' : st === 'progress' ? 'قيد الإنجاز' : d.past ? 'لم تُسجَّل' : 'لم يبدأ'}</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {d.tasks.map((t) => {
          const full = t.done >= t.total
          return (
            <li key={t.plan.kind} className="rounded-[20px] bg-night/[.03] p-4 ring-1 ring-line">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${full ? 'bg-leaf/12 text-leaf' : 'bg-gold-soft text-gold'}`}><Icon name={full ? 'check' : KIND[t.plan.kind].icon} size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold">{KIND[t.plan.kind].ar} · <span className="font-normal text-muted">{t.plan.ar}</span></p>
                  <p className="text-[12px] text-muted">{toAr(t.done)} / {toAr(t.total)} {t.plan.unit}</p>
                </div>
                {!full && !d.past && <button type="button" onClick={() => go(t.plan.kind === 'reading' ? 'home' : 'ayah')} className="press h-9 rounded-full bg-night px-3.5 text-[12.5px] font-semibold text-parchment">{t.done ? 'تابع' : 'ابدأ'}</button>}
              </div>
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full" style={{ width: `${(t.done / t.total) * 100}%`, background: full ? STATUS_COLOR.done : STATUS_COLOR.progress }} /></span>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted"><Demo />أرقام تجريبية · الخطط الحالية بأيامها ووحداتها</p>
    </div>
  )
}
