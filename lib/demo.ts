import type { HabitInput, PlannerState, Workout } from './models.ts';
import { addDays, weekOf } from './dates.ts';

const squat = {
  name: 'Sentadilla frontal con mancuernas', sets: 3, reps: 10, rest: 75,
  details: 'Sostén las mancuernas a la altura de los hombros. Baja con control y mantén el peso repartido en los pies.',
  video: 'https://www.youtube.com/watch?v=B86Zj72LwzA',
};
const deadlift = {
  name: 'Peso muerto con mancuernas', sets: 3, reps: 10, rest: 90,
  details: 'Lleva la cadera hacia atrás y acerca las mancuernas a las piernas durante el recorrido.',
  video: 'https://www.youtube.com/watch?v=JNpUNRPQkAk',
};
const pushup = {
  name: 'Flexiones', sets: 3, reps: 8, rest: 60,
  details: 'Coloca las manos debajo de los hombros. Baja y sube con el cuerpo alineado.',
  video: 'https://www.youtube.com/watch?v=_l3ySVKYVJ8',
};

export function demoState(today: string): PlannerState {
  const [monday] = weekOf(today);
  const earlier = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const habitDefinitions: [string, string, HabitInput["icon"], number, string, string][] = [
    ['agua', 'Tomar agua', 'water', 8, 'vasos', ''],
    ['sol', 'Luz de la mañana', 'sun', 1, '', '15 minutos al aire libre'],
    ['leer', 'Leer', 'book', 1, '', '10 páginas'],
    ['movilidad', 'Movilidad', 'stretch', 1, '', '10 minutos de estiramientos'],
  ];
  const habits = habitDefinitions.map(([id, name, icon, target, unit, note]) => ({
    id, name, icon, target, unit, note, created_on: addDays(monday, -7), archived_on: null,
  }));
  const workouts: Workout[] = [
    { id: 'fuerza-anterior', name: 'Fuerza de tren inferior', day: earlier, time: '07:00',
      duration: 35, category: 'Fuerza', notes: '', done: true, exercises: [squat, deadlift] },
    { id: 'fuerza-hoy', name: 'Fuerza de cuerpo completo', day: today, time: '18:30',
      duration: 45, category: 'Fuerza', notes: 'Deja listas las mancuernas y un espacio libre para las flexiones.', done: false, exercises: [squat, pushup, deadlift] },
    { id: 'fuerza-proxima', name: 'Piernas y técnica', day: tomorrow, time: '07:15',
      duration: 35, category: 'Fuerza', notes: '', done: false, exercises: [squat, deadlift] },
  ];
  const logs = [
    { habit_id: 'agua', day: today, amount: 5 },
    { habit_id: 'sol', day: today, amount: 1 },
    { habit_id: 'leer', day: today, amount: 1 },
    { habit_id: 'agua', day: earlier, amount: 8 },
    { habit_id: 'sol', day: earlier, amount: 1 },
    { habit_id: 'movilidad', day: earlier, amount: 1 },
  ];
  return { today, user: null, demo: true, habits, workouts, logs };
}
