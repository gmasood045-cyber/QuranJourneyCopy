// أذكاري — Azkar (design preview). The repo has no verified Azkar corpus, so
// every text, count, reference and grade below is a labelled placeholder.
import { useState } from 'react'
import { Chrome, Demo, Head, Icon, Placeholder, toAr, useDevice, useProto } from '../core'
import { AZKAR_GROUPS, azkarTitle, timeOfDay } from '../data'

const notice = 'ستُضاف نصوص الأذكار من مصادر موثّقة مع التخريج ودرجة الحديث وعدد التكرار الثابت. ما يظهر هنا هيكل التصميم فقط.'

export function AzkarHome() {
  const device = useDevice()
  const { go } = useProto()
  const now = timeOfDay()
  const nowCard = (
    <button type="button" onClick={() => go('azkar-list', now)} className="press hero-fade relative block w-full overflow-hidden rounded-[28px] p-6 text-start text-white">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] backdrop-blur"><Icon name={now === 'morning' ? 'sun' : 'moon'} size={14} />{now === 'morning' ? 'وقت الصباح' : 'وقت المساء'} · بحسب ساعة جهازك</span>
      <p className="mt-4 font-arabic-display text-[26px] font-bold">{azkarTitle(now)}</p>
      <p className="mt-1 text-[13px] text-white/80">ابدأ وردك الآن</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full w-[37%] rounded-full bg-white" /></span>
        <span className="text-[12px] text-white/85">٣ من ٨</span>
      </div>
      <span className="absolute end-5 top-5"><Demo className="bg-white/20 text-white" /></span>
    </button>
  )
  const favs = (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-muted">المفضّلة</p>
      <div className="grid grid-cols-2 gap-2">
        {['after-salah', 'sleep'].map((id) => (
          <button key={id} type="button" onClick={() => go('azkar-list', id)} className="press flex items-center gap-2.5 rounded-[18px] bg-card p-3.5 text-start ring-1 ring-line">
            <Icon name="heart" size={17} fill className="text-gold" />
            <span className="text-[13.5px] font-medium">{azkarTitle(id)}</span>
          </button>
        ))}
      </div>
    </div>
  )
  const groups = (
    <div className="space-y-6">
      {AZKAR_GROUPS.map((g) => (
        <section key={g.id}>
          <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft text-gold"><Icon name={g.icon} size={16} /></span>{g.ar}</h2>
          <div className={`grid gap-2 ${device === 'desktop' ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {g.items.map((it) => (
              <button key={it.id} type="button" onClick={() => go('azkar-list', it.id)} className="press flex min-h-[64px] items-center justify-between gap-2 rounded-[18px] bg-card px-4 py-3 text-start ring-1 ring-line hover:ring-gold/40">
                <span className="text-[13.5px] font-medium leading-snug">{it.ar}</span>
                <Icon name="chevron" size={15} className="shrink-0 rotate-180 text-muted" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
  if (device === 'desktop')
    return (
      <Chrome>
        <div className="no-scrollbar h-full overflow-y-auto px-10 py-9">
          <Head title="أذكاري" sub="ورد يومي هادئ يرافقك بحسب وقتك." />
          <div className="grid grid-cols-[1fr_340px] gap-8">
            <div>
              <p className="mb-5 flex items-start gap-2 rounded-[16px] bg-clay/[.05] p-3 text-[12.5px] leading-relaxed text-night/75 ring-1 ring-clay/20"><Icon name="shield" size={16} className="mt-0.5 shrink-0 text-clay" />{notice}</p>
              {groups}
            </div>
            <div className="space-y-6">{nowCard}{favs}</div>
          </div>
        </div>
      </Chrome>
    )
  return (
    <Chrome>
      <div className="px-5 pb-8 pt-4">
        <Head title="أذكاري" sub="ورد يومي هادئ بحسب وقتك." />
        {nowCard}
        <p className="my-4 flex items-start gap-2 rounded-[16px] bg-clay/[.05] p-3 text-[12px] leading-relaxed text-night/75 ring-1 ring-clay/20"><Icon name="shield" size={15} className="mt-0.5 shrink-0 text-clay" />{notice}</p>
        <div className="mb-6">{favs}</div>
        {groups}
      </div>
    </Chrome>
  )
}

const SAMPLE = [{ n: 1 }, { n: 3 }, { n: 3 }, { n: 1 }]

export function AzkarList() {
  const device = useDevice()
  const { nav } = useProto()
  const id = nav.param ?? timeOfDay()
  const [count, setCount] = useState<number[]>(SAMPLE.map(() => 0))
  const [fav, setFav] = useState<Record<number, boolean>>({ 1: true })
  const done = count.filter((c, i) => c >= SAMPLE[i].n).length
  return (
    <Chrome>
      <div className={`no-scrollbar ${device === 'desktop' ? 'mx-auto h-full max-w-[760px] overflow-y-auto px-10 py-9' : 'px-5 pb-8 pt-4'}`}>
        <Head
          back="azkar"
          title={azkarTitle(id)}
          sub={`${toAr(done)} من ${toAr(SAMPLE.length)} مكتملة`}
          action={
            <span className="relative flex h-12 w-12 items-center justify-center">
              <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="4" /><circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-leaf)" strokeWidth="4" strokeLinecap="round" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - done / SAMPLE.length)} style={{ transition: 'stroke-dashoffset .4s' }} /></svg>
              <span className="text-[12px] font-bold">{toAr(done)}</span>
            </span>
          }
        />
        <Placeholder className="mb-5">{notice} العدد في كل بطاقة رقم تجريبي لتجربة العدّاد.</Placeholder>
        <ol className="space-y-4">
          {SAMPLE.map((z, i) => {
            const c = count[i]
            const full = c >= z.n
            return (
              <li key={i} className={`rounded-[26px] p-5 ring-1 transition ${full ? 'bg-leaf/[.06] ring-leaf/30' : 'bg-card ring-line'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-muted">الذكر {toAr(i + 1)}</span>
                  <div className="flex items-center gap-1.5">
                    {full && <span className="flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] font-semibold text-leaf"><Icon name="check" size={12} />مكتمل</span>}
                    <button type="button" onClick={() => setFav((x) => ({ ...x, [i]: !x[i] }))} aria-pressed={!!fav[i]} aria-label="المفضّلة" className="press flex h-9 w-9 items-center justify-center rounded-full hover:bg-night/5"><Icon name="heart" size={18} fill={!!fav[i]} className={fav[i] ? 'text-gold' : 'text-muted'} /></button>
                  </div>
                </div>
                <div className="my-4 rounded-[18px] border border-dashed border-line px-4 py-6 text-center">
                  <p className="text-[19px] leading-loose text-muted" style={{ fontFamily: "'Amiri'" }}>نصّ الذكر يُضاف هنا من مصدر موثّق</p>
                  <div className="mx-auto mt-3 space-y-2">{[86, 72].map((w) => <span key={w} className="mx-auto block h-2.5 rounded-full bg-night/[.06]" style={{ width: `${w}%` }} />)}</div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-2xl bg-night/[.03] px-3 py-2"><dt className="text-muted">المصدر</dt><dd className="mt-0.5 font-medium text-muted">يُضاف مع التخريج</dd></div>
                  <div className="rounded-2xl bg-night/[.03] px-3 py-2"><dt className="text-muted">درجة الحديث</dt><dd className="mt-0.5 font-medium text-muted">تُضاف إن وُجدت</dd></div>
                </dl>
                <div className="mt-4 flex items-center gap-4">
                  <button type="button" disabled={full} onClick={() => setCount((x) => x.map((v, k) => (k === i ? v + 1 : v)))} aria-label={`عدّ، متبقٍ ${z.n - c}`} className={`press relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[18px] font-bold ${full ? 'bg-leaf text-white' : 'bg-night text-parchment'}`}>
                    {full ? <Icon name="check" size={24} /> : toAr(c)}
                  </button>
                  <div className="flex-1">
                    <p className="text-[13.5px] font-semibold">{full ? 'أتممته' : `متبقٍ ${toAr(z.n - c)}`}</p>
                    <p className="text-[11.5px] text-muted">التكرار: {toAr(z.n)} · عدد تجريبي</p>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full bg-leaf transition-[width]" style={{ width: `${(Math.min(c, z.n) / z.n) * 100}%` }} /></span>
                  </div>
                  {c > 0 && !full && <button type="button" onClick={() => setCount((x) => x.map((v, k) => (k === i ? 0 : v)))} aria-label="إعادة العدّ" className="press flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-night/5"><Icon name="refresh" size={16} /></button>}
                </div>
              </li>
            )
          })}
        </ol>
        {done === SAMPLE.length && <p className="mt-6 rounded-[22px] bg-leaf/10 p-4 text-center text-[14px] font-semibold text-leaf">أتممت {azkarTitle(id)}</p>}
      </div>
    </Chrome>
  )
}
