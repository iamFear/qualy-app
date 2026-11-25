import type { HabitIcon, WorkoutCategory } from './options.ts';

export type Exercise = {
  name: string;
  sets: number;
  reps: number;
  rest: number;
  details: string;
  video: string;
};

export type WorkoutInput = {
  name: string;
  day: string;
  time: string;
  duration: number;
  category: WorkoutCategory;
  notes: string;
  exercises: Exercise[];
};

export type Workout = WorkoutInput & { id: string; done: boolean };

export type HabitInput = {
  name: string;
  icon: HabitIcon;
  target: number;
  unit: string;
  note: string;
};

export type Habit = HabitInput & { id: string; created_on: string; archived_on: string | null };
export type HabitLog = { habit_id: string; day: string; amount: number };
export type HabitLogInput = { delta: number } | { done: boolean };

export type PlannerState = {
  today: string;
  demo: boolean;
  user: { name: string; email: string } | null;
  workouts: Workout[];
  habits: Habit[];
  logs: HabitLog[];
};

export type QualyState = PlannerState & { signedIn: boolean };
