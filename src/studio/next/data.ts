// Demonstration data for the design preview. Progress is stored the way the
// app stores it (ayah records / plan days) and every figure shown is computed
// from those records against the real Juz/Surah metadata. Nothing here is real
// user progress and every surface showing it carries a "بيانات تجريبية" badge.
import { JUZ, SHORT_SURAHS_FOR_KIDS, SURAHS, gIndex, juzEnd, surah, type Pos } from '../../lib/quran'
import { HARAKAT, JOIN_WORDS, LETTERS, READING_LESSONS } from '../../screens/kidsData'
import type { Status } from './iso'

/** Demo memorisation records (inclusive ayah ranges), as the app's `progress` would hold them. */
export const DEMO_MEMORISED: [Pos, Pos][] = [
  [[1, 1], [1, 7]],
  [[2, 1], [2, 25]],
  [[67, 1], [72, 28]],
  [[78, 1], [114, 6]],
]
const RANGES = DEMO_MEMORISED.map(([a, b]) => [gIndex(...a), gIndex(...b)] as const)
const countIn = (g0: number, g1: number) => RANGES.reduce((n, [a, b]) => n + Math.max(0, Math.min(b, g1) - Math.max(a, g0) + 1), 0)

export type JuzInfo = { j: number; start: Pos; end: Pos; total: number; memorised: number; status: Status; surahs: number[] }
export const JUZ_INFO: JuzInfo[] = JUZ.map((start, i) => {
  const j = i + 1
  const end = juzEnd(j)
  const g0 = gIndex(...start)
  const g1 = gIndex(...end)
  const memorised = countIn(g0, g1)
  const total = g1 - g0 + 1
  const surahs = SURAHS.filter((s) => gIndex(s.n, 1) <= g1 && gIndex(s.n, s.ayat) >= g0).map((s) => s.n)
  return { j, start, end, total, memorised, surahs, status: memorised === 0 ? 'idle' : memorised === total ? 'done' : 'progress' }
})

/** Demo memorised ayat inside a global-index range (inclusive). */
export const memorisedBetween = countIn
export const surahMemorised = (n: number) => countIn(gIndex(n, 1), gIndex(n, surah(n).ayat))
export const TOTAL_MEMORISED = JUZ_INFO.reduce((n, x) => n + x.memorised, 0)

export const JUZ_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون']

// ---- Weekly plans (same model as lib/plans: kind + study weekdays + daily units)
export type DemoPlan = { kind: 'hifz' | 'revision' | 'reading'; ar: string; days: number[]; daily: number; unit: 'آية' | 'صفحة' }
export const DEMO_PLANS: DemoPlan[] = [
  { kind: 'hifz', ar: 'حفظ سورة الملك والجنّ', days: [6, 0, 1, 2, 3], daily: 5, unit: 'آية' },
  { kind: 'revision', ar: 'مراجعة جزء عمّ', days: [6, 0, 1, 2, 3, 4], daily: 20, unit: 'آية' },
  { kind: 'reading', ar: 'ورد يومي', days: [6, 0, 1, 2, 3, 4], daily: 4, unit: 'صفحة' },
]
/** Demo log: units done per weekday for days already passed this week. */
export function weekLog(todayDow: number, order: number[]) {
  const pos = order.indexOf(todayDow)
  return order.map((dow, i) => {
    const plans = DEMO_PLANS.filter((p) => p.days.includes(dow))
    const tasks = plans.map((p, k) => {
      const done = i < pos ? (k === 1 && i === 2 ? Math.round(p.daily * 0.5) : p.daily) : i === pos ? (k === 0 ? p.daily : k === 1 ? Math.round(p.daily * 0.4) : 0) : 0
      return { plan: p, done, total: p.daily }
    })
    return { dow, tasks, rest: plans.length === 0, past: i < pos, today: i === pos }
  })
}

// ---- Kids (real lesson inventories from screens/kidsData; demo completion)
export const KIDS_ROOMS = [
  { id: 'letters', ar: 'الحروف', sub: 'الحروف وأصواتها', icon: 'letters', total: LETTERS.length, done: 12, items: LETTERS.map((l) => l.ch) },
  { id: 'harakat', ar: 'الحركات', sub: 'فتحة، كسرة، ضمّة…', icon: 'sparkle', total: HARAKAT.length, done: 3, items: HARAKAT.map((h) => `ب${h.mark}`) },
  { id: 'joining', ar: 'وصل الحروف', sub: 'اصنع كلمة', icon: 'layers', total: JOIN_WORDS.length, done: 0, items: JOIN_WORDS.map((w) => w.word) },
  { id: 'reading', ar: 'القراءة', sub: 'تمارين قصيرة', icon: 'book', total: READING_LESSONS.length, done: 0, items: READING_LESSONS.map((r) => r.ar) },
  { id: 'surahs', ar: 'السور القصيرة', sub: 'استمع وكرّر', icon: 'heart', total: SHORT_SURAHS_FOR_KIDS.length, done: 4, items: SHORT_SURAHS_FOR_KIDS.map((n) => surah(n).ar) },
] as const
export type KidsRoom = (typeof KIDS_ROOMS)[number]
export const roomStatus = (r: KidsRoom): Status => (r.done === 0 ? 'idle' : r.done >= r.total ? 'done' : 'progress')

// ---- Azkar taxonomy (category names only; texts are placeholders until verified)
export const AZKAR_GROUPS: { id: string; ar: string; icon: string; items: { id: string; ar: string }[] }[] = [
  { id: 'daily', ar: 'أذكار اليوم', icon: 'sun', items: [{ id: 'morning', ar: 'أذكار الصباح' }, { id: 'evening', ar: 'أذكار المساء' }, { id: 'sleep', ar: 'قبل النوم' }, { id: 'wake', ar: 'بعد الاستيقاظ' }] },
  { id: 'prayer', ar: 'الصلاة والمسجد', icon: 'clock', items: [{ id: 'adhan', ar: 'الأذان' }, { id: 'before-salah', ar: 'قبل الصلاة' }, { id: 'after-salah', ar: 'بعد الصلاة' }, { id: 'mosque', ar: 'دخول المسجد والخروج منه' }] },
  { id: 'tahara', ar: 'الطهارة', icon: 'wave', items: [{ id: 'wudu', ar: 'الوضوء' }, { id: 'khala', ar: 'دخول الخلاء والخروج منه' }] },
  { id: 'home', ar: 'البيت والحياة اليومية', icon: 'home', items: [{ id: 'home', ar: 'دخول البيت والخروج منه' }, { id: 'market', ar: 'السوق' }, { id: 'food', ar: 'الطعام والشراب' }] },
  { id: 'travel', ar: 'السفر والتحصين', icon: 'shield', items: [{ id: 'travel', ar: 'أدعية السفر' }, { id: 'protection', ar: 'أذكار التحصين' }, { id: 'ruqyah', ar: 'الرقية' }] },
  { id: 'dua', ar: 'الذكر والدعاء', icon: 'heart', items: [{ id: 'dua', ar: 'أدعية' }, { id: 'tasbeeh', ar: 'التسبيح' }, { id: 'other', ar: 'أذكار متنوعة' }] },
]
export const azkarTitle = (id: string) => AZKAR_GROUPS.flatMap((g) => g.items).find((i) => i.id === id)?.ar ?? 'أذكار'
/** Morning / evening by the viewer's local clock (real). */
export const timeOfDay = () => (new Date().getHours() < 15 ? 'morning' : 'evening')

/** Passage for the Memorization Journey preview: Surah Al-Mulk 1–5 (real KFGQPC Hafs text, loaded at runtime). */
export const JOURNEY = { s: 67, from: 1, to: 5 }
