import { toDate } from '../lib/dates.ts';
import { useLanguage } from './language.tsx';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
function calendar(locale: string) {
  function formatter(options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
  }
  const full = formatter({ weekday: 'long', day: 'numeric', month: 'long' });
  const medium = formatter({ day: 'numeric', month: 'short' });
  const weekday = formatter({ weekday: 'short' });
  const month = formatter({ month: 'long' });
  const monthYear = formatter({ month: 'long', year: 'numeric' });
  const clock = formatter({ hour: 'numeric', minute: '2-digit', hour12: true });
  const day = (value: string) => full.format(toDate(value));
  return {
    day: (value: string) => capitalize(day(value)),
    dayInSentence: day,
    mediumDay: (value: string) => medium.format(toDate(value)),
    weekday: (value: string) => capitalize(weekday.format(toDate(value)).replace(/\.$/, '')),
    month: (value: string) => capitalize(month.format(toDate(value))),
    monthYear: (value: string) => capitalize(monthYear.format(toDate(value))),
    time: (value: string) => clock.format(new Date('2000-01-01T' + value + ':00Z')).replace(/\s+(?=[ap]\.\s*m\.)/u, ' '),
  };
}
const calendars = { es: calendar('es-CO'), en: calendar('en-US') };

export function useCalendar() {
  const { locale } = useLanguage();
  return calendars[locale];
}
