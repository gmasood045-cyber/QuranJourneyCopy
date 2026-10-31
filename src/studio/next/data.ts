// Static reference data for the design preview. Progress (plans, tasks,
// memorisation, revision, reading, kids lessons, achievements) is NOT here: it
// lives in the shared preview store (./progress), so every screen derives the
// same figures from the same records.
export const JUZ_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون']

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
