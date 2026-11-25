const dateFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota',
});

export const todayInBogota = (now = new Date()) => {
  const parts = Object.fromEntries(dateFormat.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const toDate = (date: string) => new Date(`${date}T12:00:00.000Z`);

export function addDays(date: string, days: number) {
  const next = toDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function weekOf(date: string) {
  const monday = addDays(date, -((toDate(date).getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
