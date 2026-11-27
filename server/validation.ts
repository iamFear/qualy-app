import { categories, habitIcons } from '../lib/options.ts';
import type { HabitIcon } from '../lib/options.ts';
import { maxPasswordLength, minPasswordLength, registrationPasswordHelp } from '../lib/credentials.ts';
import type { TranslationValues } from '../lib/i18n.ts';
import type { HabitInput, HabitLogInput, WorkoutInput } from '../lib/models.ts';
import { toDate } from '../lib/dates.ts';

export class HttpError extends Error {
  readonly status: number;
  readonly values?: TranslationValues;

  constructor(status: number, message: string, values?: TranslationValues) {
    super(message);
    this.status = status;
    this.values = values;
  }
}

function invalid(message: string, values?: TranslationValues): never {
  throw new HttpError(422, message, values);
}

function text(value: unknown, label: string, max: number, optional = false) {
  if (optional && value == null) return '';
  if (typeof value !== 'string') invalid('Revisa el campo «{label}».', { label });
  const clean = value.trim();
  if ((!optional && !clean) || clean.length > max) invalid('Revisa el campo «{label}» (máximo {max} caracteres).', { label, max });
  return clean;
}

function integer(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    invalid('«{label}» debe ser un número entero entre {min} y {max}.', { label, min, max });
  }
  return value;
}

export function date(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2199-12-31') {
    invalid('Elige una fecha válida.');
  }
  const parsed = toDate(value);
  if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value) invalid('Elige una fecha válida.');
  return value;
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Revisa los datos del formulario.');
  return value as Record<string, unknown>;
}

function isRegistrationEmail(email: string) {
  const [localPart, domain, ...extra] = email.split('@');
  if (!domain || extra.length || localPart.length > 64) return false;
  const labels = domain.split('.');
  const topLevel = labels.at(-1) ?? '';
  return localPart.split('.').every((part) => /^[a-z\d!#$%&'*+/=?^_`{|}~-]+$/i.test(part))
    && labels.length >= 2
    && labels.every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))
    && (/^[a-z]{2,}$/i.test(topLevel) || /^xn--/i.test(topLevel))
    && URL.canParse(`https://${domain}`);
}

export function credentials(body: Record<string, unknown>, registering: boolean) {
  const email = text(body.email, 'Correo electrónico', 254);
  const validEmail = registering ? isRegistrationEmail(email) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email);
  if (!validEmail) invalid('Escribe un correo electrónico válido.');
  const { password } = body;
  if (typeof password !== 'string' || !password.length || password.length > maxPasswordLength) {
    invalid(registering ? registrationPasswordHelp : 'Revisa tu contraseña.');
  }
  if (registering && ([...password].length < minPasswordLength || !/[\p{P}\p{S}]/u.test(password))) {
    invalid(registrationPasswordHelp);
  }
  const name = registering ? text(body.name, 'Nombre', 70) : '';
  return { email: email.toLowerCase(), password, name };
}

function video(value: unknown) {
  const url = text(value, 'Video', 1000, true);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new TypeError();
    return parsed.href;
  } catch {
    invalid('Agrega un enlace de video que empiece con https://.');
  }
}

export function workout(body: Record<string, unknown>): WorkoutInput {
  const time = body.time;
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) invalid('Elige una hora válida.');
  const category = categories.find((option) => option === body.category);
  if (!category) invalid('Elige un tipo de entrenamiento.');
  if (!Array.isArray(body.exercises) || body.exercises.length < 1 || body.exercises.length > 20) {
    invalid('Agrega entre 1 y 20 ejercicios.');
  }
  return {
    name: text(body.name, 'Nombre de la sesión', 100),
    day: date(body.day),
    time,
    duration: integer(body.duration, 'Duración', 1, 600),
    category,
    notes: text(body.notes, 'Notas', 1200, true),
    exercises: body.exercises.map((value: unknown) => {
      const item = object(value);
      return {
        name: text(item.name, 'Nombre del ejercicio', 100),
        sets: integer(item.sets, 'Series', 1, 100),
        reps: integer(item.reps, 'Repeticiones', 1, 1000),
        rest: integer(item.rest, 'Descanso', 0, 3600),
        details: text(item.details, 'Detalles', 1200, true),
        video: video(item.video),
      };
    }),
  };
}

function isHabitIcon(value: unknown): value is HabitIcon {
  return typeof value === 'string' && Object.hasOwn(habitIcons, value);
}

export function habit(body: Record<string, unknown>): HabitInput {
  if (!isHabitIcon(body.icon)) invalid('Elige un ícono para el hábito.');
  const unit = text(body.unit, 'Unidad', 25, true);
  return {
    name: text(body.name, 'Nombre del hábito', 70),
    icon: body.icon,
    target: unit ? integer(body.target, 'Meta', 1, 9999) : 1,
    unit,
    note: text(body.note, 'Detalle', 100, true),
  };
}

export function completion(value: unknown) {
  if (typeof value !== 'boolean') invalid('Indica si está completado.');
  return value;
}

export function habitLog(body: Record<string, unknown>): HabitLogInput {
  if (Object.hasOwn(body, 'delta')) return { delta: integer(body.delta, 'Cantidad', -9999, 9999) };
  return { done: completion(body.done) };
}
