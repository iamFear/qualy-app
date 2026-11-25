export const titles = {
  '/hoy': 'Hoy',
  '/agenda': 'Agenda',
  '/entrenamientos': 'Entrenamientos',
  '/habitos': 'Hábitos',
  '/cuenta': 'Mi cuenta',
};

export type Section = keyof typeof titles;

export function isSection(value: string): value is Section {
  return Object.hasOwn(titles, value);
}
