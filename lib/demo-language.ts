import type { Locale } from './i18n.ts';
import type { PlannerState } from './models.ts';
import { demoState } from './demo.ts';

const examples: Record<string, string> = {
  'Sentadilla frontal con mancuernas': 'Dumbbell front squat',
  'Sostén las mancuernas a la altura de los hombros. Baja con control y mantén el peso repartido en los pies.':
    'Hold the dumbbells at shoulder height. Lower with control and keep your weight evenly distributed across your feet.',
  'Peso muerto con mancuernas': 'Dumbbell deadlift',
  'Lleva la cadera hacia atrás y acerca las mancuernas a las piernas durante el recorrido.':
    'Push your hips back and keep the dumbbells close to your legs throughout the movement.',
  Flexiones: 'Push-ups',
  'Coloca las manos debajo de los hombros. Baja y sube con el cuerpo alineado.':
    'Place your hands under your shoulders. Lower and push up while keeping your body aligned.',
  'Tomar agua': 'Drink water',
  vasos: 'glasses',
  'Luz de la mañana': 'Morning sunlight',
  '15 minutos al aire libre': '15 minutes outdoors',
  Leer: 'Read',
  '10 páginas': '10 pages',
  Movilidad: 'Mobility',
  '10 minutos de estiramientos': '10 minutes of stretching',
  'Fuerza de tren inferior': 'Lower-body strength',
  'Fuerza de cuerpo completo': 'Full-body strength',
  'Deja listas las mancuernas y un espacio libre para las flexiones.': 'Set out your dumbbells and clear some space for push-ups.',
  'Piernas y técnica': 'Legs and technique',
};

export function localizeDemo(state: PlannerState, locale: Locale): PlannerState {
  if (!state.demo) return state;
  const seed = demoState(state.today);
  function localize(value: string, original: string) {
    const english = Object.hasOwn(examples, original) ? examples[original] : undefined;
    return english && (value === original || value === english) ? (locale === 'en' ? english : original) : value;
  }

  return {
    ...state,
    habits: state.habits.map((habit) => {
      const original = seed.habits.find(({ id }) => id === habit.id);
      return original ? {
        ...habit,
        name: localize(habit.name, original.name),
        unit: localize(habit.unit, original.unit),
        note: localize(habit.note, original.note),
      } : habit;
    }),
    workouts: state.workouts.map((workout) => {
      const original = seed.workouts.find(({ id }) => id === workout.id);
      return original ? {
        ...workout,
        name: localize(workout.name, original.name),
        notes: localize(workout.notes, original.notes),
        exercises: workout.exercises.map((exercise) => {
          const source = original.exercises.find(({ name }) => name === exercise.name || examples[name] === exercise.name);
          return source ? { ...exercise, name: localize(exercise.name, source.name), details: localize(exercise.details, source.details) } : exercise;
        }),
      } : workout;
    }),
  };
}
