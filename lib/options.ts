export const categories = ['Fuerza', 'Cardio', 'Movilidad', 'Funcional', 'Otro'] as const;
export type WorkoutCategory = (typeof categories)[number];

export const habitIcons = { water: 'Agua', sun: 'Sol', book: 'Lectura', stretch: 'Movimiento', target: 'Meta' };
export type HabitIcon = keyof typeof habitIcons;

export const defaultHabitUnit = 'veces';
