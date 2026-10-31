// عالم الأطفال — isometric learning house (design preview). A navigation layer
// over the existing Kids lessons (screens/Kids.tsx); inventories come from
// screens/kidsData.ts, completion is demonstration data.
import { useState, type ReactNode } from 'react'
import { Chrome, Demo, Head, Icon, MoreTabs, toAr, useDevice, useProto } from '../core'
import { KIDS_ROOMS, roomStatus, type KidsRoom } from '../data'
import { Box, GlowDefs, STATUS_COLOR, kernel, tint, type Faces } from '../iso'

const WALL = 56
const T = 6
type Rect = { x: number; y: number; w: number; d: number }
const ROOMS: Record<KidsRoom['id'], Rect & { tone: string }> = {
  letters: { x: 0, y: 0, w: 112, d: 108, tone: 'var(--color-kid-1)' },
  harakat: { x: 112, y: 0, w: 112, d: 108, tone: 'var(--color-kid-2)' },
  joining: { x: 224, y: 0, w: 112, d: 108, tone: 'var(--color-kid-3)' },
  reading: { x: 0, y: 140, w: 168, d: 100, tone: 'var(--color-kid-4)' },
  surahs: { x: 168, y: 140, w: 168, d: 100, tone: 'var(--color-kid-5)' },
}
const ROUTE: Record<KidsRoom['id'], string> = { letters: '#/kids/letters', harakat: '#/kids/harakat', joining: '#/kids/joining', reading: '#/kids/reading', surahs: '#/kids/surahs' }

/** Shortcut to the children's rewards (Rewards & Achievements, kids mode). */
function StarsLink() {
  const { go } = useProto()
  return (
    <span className="flex shrink-0 items-center gap-2">
      <button type="button" onClick={() => go('rewards', 'kids')} className="press flex h-9 items-center gap-1.5 rounded-full bg-kid-2 px-3 text-[12.5px] font-semibold"><Icon name="star" size={15} fill className="text-gold" />نجومي</button>
      <Demo />
    </span>
  )
}

export function KidsHouse() {
  const device = useDevice()
  const [sel, setSel] = useState<KidsRoom['id']>('letters')
  const room = KIDS_ROOMS.find((r) => r.id === sel)!
  const intro = 'خمس غرف، لكل غرفة درس. اختر غرفة لترى رحلتها وتقدّمك فيها.'
  if (device === 'desktop')
    return (
      <Chrome>
        <div className="flex h-full">
          <div className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-10 py-9">
            <Head title="عالم الأطفال" sub={intro} action={<StarsLink />} />
            <House sel={sel} onSel={setSel} />
          </div>
          <aside className="no-scrollbar w-[370px] shrink-0 overflow-y-auto border-s border-line/60 bg-card/60 p-6"><RoomPanel r={room} /></aside>
        </div>
      </Chrome>
    )
  return (
    <Chrome>
      <div className="px-5 pb-8 pt-4">
        <MoreTabs />
        <Head title="عالم الأطفال" sub={intro} action={<StarsLink />} />
        <House sel={sel} onSel={setSel} />
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {KIDS_ROOMS.map((r) => (
            <button key={r.id} type="button" onClick={() => setSel(r.id)} className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] ${sel === r.id ? 'bg-night text-parchment' : 'bg-card ring-1 ring-line'}`}>
              <Icon name={r.icon} size={15} />
              {r.ar}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-[26px] bg-card p-5 ring-1 ring-line"><RoomPanel r={room} /></div>
      </div>
    </Chrome>
  )
}

function House({ sel, onSel }: { sel: KidsRoom['id']; onSel: (id: KidsRoom['id']) => void }) {
  const k = kernel(244, 86)
  const ground = tint('var(--color-leaf)', 0.18)
  return (
    <svg viewBox="0 0 540 420" className="mx-auto w-full max-w-[640px]" role="group" aria-label="بيت التعلّم: خمس غرف">
      <GlowDefs id="kid" />
      <Box k={k} x={-18} y={-18} z={-10} w={372} d={278} h={10} f={ground} />
      {/* Courtyard path between the two rows */}
      <polygon points={k.poly([[-18, 112], [354, 112], [354, 136], [-18, 136]].map(([x, y]) => [x, y, 0] as [number, number, number]))} fill="var(--color-card)" opacity={0.9} />
      {KIDS_ROOMS.map((r) => (
        <Room key={r.id} k={k} r={r} rect={ROOMS[r.id]} on={sel === r.id} onSel={() => onSel(r.id)} />
      ))}
      {/* Entrance sign */}
      <g>
        <Box k={k} x={160} y={262} z={0} w={4} d={4} h={34} f={tint('var(--color-gold)', 0.4)} />
        <g transform={k.FRONT(132, 266, 52)}>
          <rect width={60} height={18} rx={4} fill="var(--color-gold)" />
          <text x={30} y={12.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="white">بيت التعلّم</text>
        </g>
      </g>
    </svg>
  )
}

function Room({ k, r, rect, on, onSel }: { k: ReturnType<typeof kernel>; r: KidsRoom; rect: Rect & { tone: string }; on: boolean; onSel: () => void }) {
  const { x, y, w, d, tone } = rect
  const st = roomStatus(r)
  const wall: Faces = { top: 'var(--color-card)', front: `color-mix(in oklab, ${tone} 55%, var(--color-card))`, side: `color-mix(in oklab, ${tone} 70%, var(--color-night) 10%)`, stroke: 'color-mix(in oklab, var(--color-line) 70%, var(--color-night) 15%)' }
  const floor = `color-mix(in oklab, ${tone} 80%, var(--color-card))`
  const [lx, ly] = k.P(x + w / 2, y + d / 2, WALL + 24)
  const [cx, cy] = k.P(x + w / 2, y + d / 2, 10)
  return (
    <g className="iso-hit" role="button" tabIndex={0} aria-pressed={on} aria-label={`غرفة ${r.ar}: ${r.done} من ${r.total}`} onClick={onSel} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSel())}>
      <polygon points={k.poly([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill={floor} stroke={wall.stroke} strokeWidth={0.8} />
      {st !== 'idle' && <ellipse className="iso-halo" cx={cx} cy={cy} rx={w * 0.55} ry={d * 0.3} fill={STATUS_COLOR[st]} filter="url(#kid-bloom)" />}
      <Box k={k} x={x} y={y} z={0} w={w} d={T} h={WALL} f={wall} />
      <Box k={k} x={x} y={y} z={0} w={T} d={d} h={WALL} f={wall} />
      <Props k={k} id={r.id} x={x} y={y} w={w} d={d} lit={st !== 'idle'} />
      {on && <polygon points={k.poly([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} fill="none" stroke="var(--color-night)" strokeWidth={1.8} />}
      <g className="iso-lift">
        <rect x={lx - 38} y={ly - 13} width={76} height={24} rx={12} fill="var(--color-card)" stroke={on ? 'var(--color-night)' : 'var(--color-line)'} strokeWidth={on ? 1.4 : 0.8} />
        <circle cx={lx + 26} cy={ly - 1} r={4} fill={st === 'idle' ? 'var(--color-line)' : STATUS_COLOR[st]} />
        <text x={lx - 4} y={ly + 3.5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--color-night)">{r.ar}</text>
      </g>
    </g>
  )
}

/** Room furniture that tells what is learned inside. */
function Props({ k, id, x, y, w, d, lit }: { k: ReturnType<typeof kernel>; id: KidsRoom['id']; x: number; y: number; w: number; d: number; lit: boolean }) {
  const ink = 'var(--color-night)'
  const wood = tint('var(--color-gold)', 0.35)
  const board = (children: ReactNode, bw = w - 40, bh = 28, bg = 'color-mix(in oklab, var(--color-leaf) 55%, var(--color-night) 35%)') => (
    <g transform={k.FRONT(x + 20, y + T, WALL - 10)}>
      <rect width={bw} height={bh} rx={3} fill={bg} stroke="var(--color-gold)" strokeWidth={1} />
      {children}
    </g>
  )
  if (id === 'letters')
    return (
      <g>
        {board(<text x={(w - 40) / 2} y={20} textAnchor="middle" fontSize={15} fill="white" fontFamily="'IBM Plex Sans Arabic'">أ ب ت</text>)}
        <Box k={k} x={x + 30} y={y + 50} z={0} w={34} d={22} h={14} f={wood} />
        <Box k={k} x={x + 72} y={y + 54} z={0} w={12} d={12} h={9} f={tint('var(--color-sky)', 0.5)} />
      </g>
    )
  if (id === 'harakat')
    return (
      <g>
        {board(<text x={(w - 40) / 2} y={21} textAnchor="middle" fontSize={16} fill="var(--color-night)" fontFamily="'Amiri'">بَ بِ بُ</text>, w - 40, 28, 'var(--color-card)')}
        {[0, 1, 2].map((i) => <Box key={i} k={k} x={x + 22 + i * 26} y={y + 62} z={0} w={20} d={20} h={7} f={tint(['var(--color-clay)', 'var(--color-gold)', 'var(--color-sky)'][i], 0.55)} />)}
      </g>
    )
  if (id === 'joining')
    return (
      <g>
        {['ب', 'ي', 'ت'].map((ch, i) => (
          <g key={ch}>
            <Box k={k} x={x + 24 + i * 24} y={y + 46} z={0} w={20} d={20} h={20} f={tint(['var(--color-sky)', 'var(--color-gold)', 'var(--color-leaf)'][i], 0.6)} />
            <g transform={k.FRONT(x + 24 + i * 24, y + 66, 20)}><text x={10} y={15} textAnchor="middle" fontSize={13} fontWeight={700} fill={ink}>{ch}</text></g>
          </g>
        ))}
        <g transform={k.FRONT(x + 20, y + T, WALL - 12)}><text x={(w - 40) / 2} y={14} textAnchor="middle" fontSize={11} fill={ink}>بـيـت = بيت</text></g>
      </g>
    )
  if (id === 'reading')
    return (
      <g>
        <Box k={k} x={x + T} y={y + 12} z={0} w={16} d={70} h={44} f={wood} />
        {[0, 1, 2, 3].map((i) => <Box key={i} k={k} x={x + T + 4} y={y + 18 + i * 15} z={24} w={10} d={10} h={14} f={tint(['var(--color-clay)', 'var(--color-sky)', 'var(--color-gold)', 'var(--color-leaf)'][i], 0.55)} />)}
        <Box k={k} x={x + 62} y={y + 40} z={0} w={50} d={30} h={16} f={wood} />
        <polygon points={k.poly([[x + 66, y + 44, 17], [x + 87, y + 44, 21], [x + 87, y + 66, 21], [x + 66, y + 66, 17]])} fill="var(--color-card)" stroke="var(--color-line)" strokeWidth={0.6} />
        <polygon points={k.poly([[x + 87, y + 44, 21], [x + 108, y + 44, 17], [x + 108, y + 66, 17], [x + 87, y + 66, 21]])} fill="var(--color-card)" stroke="var(--color-line)" strokeWidth={0.6} />
        <g transform={k.FRONT(x + 40, y + T, WALL - 10)}><text x={50} y={16} textAnchor="middle" fontSize={13} fontWeight={700} fill={ink}>اقرأ</text></g>
      </g>
    )
  // surahs: book stand (rahl) with a lantern
  const [lx, ly] = k.P(x + 120, y + 40, 46)
  return (
    <g>
      <Box k={k} x={x + 40} y={y + 40} z={0} w={60} d={34} h={10} f={tint('var(--color-leaf)', 0.4)} />
      <polygon points={k.poly([[x + 52, y + 50, 10], [x + 88, y + 50, 10], [x + 88, y + 62, 30], [x + 52, y + 62, 30]])} fill={wood.front} stroke={wood.stroke} strokeWidth={0.8} />
      <polygon points={k.poly([[x + 55, y + 52, 13], [x + 85, y + 52, 13], [x + 85, y + 61, 28], [x + 55, y + 61, 28]])} fill="var(--color-card)" />
      <line x1={lx} y1={ly - 22} x2={lx} y2={ly - 8} stroke="var(--color-line)" strokeWidth={0.8} />
      {lit && <circle className="iso-halo" cx={lx} cy={ly} r={16} fill="var(--color-gold)" filter="url(#kid-bloom)" />}
      <rect x={lx - 5} y={ly - 8} width={10} height={14} rx={3} fill={lit ? 'var(--color-gold)' : 'var(--color-card)'} stroke="var(--color-gold)" strokeWidth={0.8} />
    </g>
  )
}

function RoomPanel({ r }: { r: KidsRoom }) {
  const st = roomStatus(r)
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-gold-soft text-gold"><Icon name={r.icon} size={22} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-arabic-display text-[20px] font-bold">{r.ar}</h2>
          <p className="text-[13px] text-muted">{r.sub}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[13px]">
        <span><b className="text-[20px]">{toAr(r.done)}</b> <span className="text-muted">من {toAr(r.total)}</span></span>
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${st === 'done' ? 'bg-leaf/10 text-leaf' : st === 'progress' ? 'bg-gold-soft' : 'bg-night/[.05] text-muted'}`}>{st === 'done' ? 'اكتملت' : st === 'progress' ? 'نتعلّمها الآن' : 'لم نبدأ بعد'}</span>
      </div>
      <span className="mt-2 block h-2 overflow-hidden rounded-full bg-night/10"><span className="block h-full rounded-full bg-gold" style={{ width: `${(r.done / r.total) * 100}%` }} /></span>
      <p className="mb-2 mt-5 text-[12.5px] font-semibold text-muted">رحلة الغرفة</p>
      <ol className="grid grid-cols-5 gap-1.5" dir="rtl">
        {r.items.slice(0, 15).map((it, i) => {
          const s = i < r.done ? 'done' : i === r.done ? 'next' : 'todo'
          return (
            <li key={i} className={`flex aspect-square items-center justify-center rounded-[14px] text-center ${r.id === 'reading' || r.id === 'surahs' ? 'text-[10.5px] leading-tight' : 'text-[20px]'} ${s === 'done' ? 'bg-leaf/12 text-leaf ring-1 ring-leaf/30' : s === 'next' ? 'bg-gold-soft ring-2 ring-gold' : 'bg-night/[.04] text-muted'}`} title={s === 'done' ? 'مكتمل' : s === 'next' ? 'التالي' : 'لم يبدأ'} style={r.id === 'letters' || r.id === 'harakat' || r.id === 'joining' ? { fontFamily: "'Amiri'" } : undefined}>
              {it}
            </li>
          )
        })}
      </ol>
      {r.items.length > 15 && <p className="mt-2 text-[12px] text-muted">و{toAr(r.items.length - 15)} أخرى</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-leaf" />مكتمل</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" />التالي</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-line" />لم يبدأ</span>
      </div>
      <a href={ROUTE[r.id]} target="_blank" rel="noreferrer" className="press mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-night text-[14px] font-semibold text-parchment">
        {st === 'idle' ? 'ابدأ الدرس' : 'تابع الدرس'}
        <Icon name="chevron" size={16} className="rotate-180" />
      </a>
      <p className="mt-2 text-center text-[11px] text-muted">يفتح الدرس الحالي في قسم الأطفال كما هو</p>
    </div>
  )
}
