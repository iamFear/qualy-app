import { useEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { Exercise, Habit, Workout } from '../lib/models.ts';
import { categories, defaultHabitUnit, habitIcons } from '../lib/options.ts';
import { Button, Icon, IconButton, plural } from './views.tsx';
import { useLanguage } from './language.tsx';
import { useCalendar } from './format-language.ts';

type FormStatus = { pending: boolean; error: string };
type Rest = { seconds: number; end: number; key: number };

export type PlannerDialog =
  | { kind: 'workout-form'; item?: Workout; day?: string }
  | { kind: 'workout-detail' | 'delete-workout'; item: Workout }
  | { kind: 'habit-form'; item?: Habit }
  | { kind: 'archive-habit'; item: Habit };


function ModalHeader({ title, note }: { title: string; note?: string }) {
  const { t } = useLanguage();
  return <header className="modal-header">
    <div><h2 id="modal-title">{title}</h2>{note && <p>{note}</p>}</div>
    <IconButton action="close-modal" glyph="close" label={t('Cerrar ventana')} />
  </header>;
}

function Field({ label, name, value, ...props }: ComponentPropsWithoutRef<'input'> & { label: string }) {
  return <label>{label}<input name={name} defaultValue={value ?? ''} {...props} /></label>;
}

function TextArea({ label, name, value, ...props }: ComponentPropsWithoutRef<'textarea'> & { label: string }) {
  return <label>{label}<textarea name={name} defaultValue={value ?? ''} {...props} /></label>;
}

function NumberField({ label, name, value, min, max }: { label: string; name: string; value: number; min: number; max: number }) {
  return <Field label={label} name={name} value={value} type="number" min={min} max={max} inputMode="numeric" required />;
}

function FormError({ error }: Pick<FormStatus, 'error'>) {
  const message = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) message.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);
  return <p className="form-error" ref={message} role="alert" hidden={!error}>{error}</p>;
}

function WorkoutForm({ day, item, pending, error }: FormStatus & { day?: string; item?: Workout }) {
  const { t } = useLanguage();
  const [exercises, setExercises] = useState<{ exercise: Partial<Exercise>; key: number }[]>(() => (item?.exercises ?? [{}]).map((exercise, key) => ({ exercise, key })));
  const nextKey = useRef(exercises.length);
  const list = useRef<HTMLDivElement>(null);

  function addExercise() {
    const key = nextKey.current++;
    setExercises((previous) => [...previous, { exercise: {}, key }]);
    requestAnimationFrame(() => list.current?.lastElementChild?.querySelector('input')?.focus());
  }

  function removeExercise(index: number) {
    const field = list.current?.children[index];
    if (!field) return;
    (field.previousElementSibling ?? field.nextElementSibling)?.querySelector('input')?.focus();
    setExercises((previous) => previous.filter((_, position) => position !== index));
  }

  return <>
    <ModalHeader title={item ? t('Editar sesión') : t('Nueva sesión')} note={t('Elige cuándo entrenar y prepara tus ejercicios.')} />
    <form id="workout-form" className="modal-form" data-id={item?.id}>
      <Field label={t('Nombre de la sesión')} name="name" value={item?.name} maxLength={100} placeholder={t('Ej. Fuerza de cuerpo completo')} required data-autofocus="" />
      <div className="form-grid two">
        <Field label={t('Día')} name="day" type="date" value={item?.day ?? day} min="1900-01-01" max="2199-12-31" required />
        <Field label={t('Hora')} name="time" type="time" value={item?.time ?? '07:00'} required />
        <div className="field"><label htmlFor="workout-category">{t('Tipo de entrenamiento')}</label>
          <select id="workout-category" name="category" defaultValue={item?.category ?? categories[0]}>
            {categories.map((category) => <option key={category} value={category}>{t(category)}</option>)}
          </select>
        </div>
        <NumberField label={t('Duración (min)')} name="duration" value={item?.duration ?? 45} min={1} max={600} />
      </div>
      <TextArea label={t('Notas de la sesión (opcional)')} name="notes" value={item?.notes} rows={2} maxLength={1200} />
      <div id="exercise-fields" ref={list}>{exercises.map(({ exercise, key }, index) => <fieldset className="exercise-fields" key={key}>
        <legend>{t('Ejercicio')} <span>{index + 1}</span></legend>
        <IconButton glyph="trash" label={t('Quitar ejercicio {number}', { number: index + 1 })} hidden={exercises.length < 2} onClick={() => removeExercise(index)} />
        <Field label={t('Nombre del ejercicio')} name="exercise-name" value={exercise.name} maxLength={100} placeholder={t('Ej. Sentadilla con mancuernas')} required />
        <div className="form-grid three">
          <NumberField label={t('Series')} name="sets" value={exercise.sets ?? 3} min={1} max={100} />
          <NumberField label={t('Repeticiones')} name="reps" value={exercise.reps ?? 10} min={1} max={1000} />
          <NumberField label={t('Descanso (s)')} name="rest" value={exercise.rest ?? 60} min={0} max={3600} />
        </div>
        <TextArea label={t('Detalles del movimiento')} name="details" value={exercise.details} rows={2} maxLength={1200} placeholder={t('Instrucciones o puntos de técnica')} />
        <Field label={t('Enlace al video (opcional)')} name="video" value={exercise.video} type="url" maxLength={1000} placeholder="https://" />
      </fieldset>)}</div>
      <Button glyph="plus" disabled={exercises.length >= 20} onClick={addExercise}>{t('Añadir ejercicio')}</Button>
      <FormError error={error} />
      <footer className="modal-footer">
        <Button action="close-modal">{t('Cancelar')}</Button>
        <button type="submit" className="button primary" disabled={pending}>{item ? t('Guardar cambios') : t('Crear sesión')}</button>
      </footer>
    </form>
  </>;
}

function HabitForm({ item, pending, error }: FormStatus & { item?: Habit }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(item?.unit ? 'quantity' : 'check');
  const quantity = mode === 'quantity';
  const unit = !item?.unit || item.unit === defaultHabitUnit ? t(defaultHabitUnit) : item.unit;
  return <>
    <ModalHeader title={item ? t('Editar hábito') : t('Nuevo hábito')} note={t('Elige algo que quieras repetir cada día.')} />
    <form id="habit-form" className="modal-form" data-id={item?.id}>
      <Field label={t('Nombre del hábito')} name="name" value={item?.name} maxLength={70} placeholder={t('Ej. Tomar agua')} required data-autofocus="" />
      <fieldset className="habit-mode">
        <legend>{t('Tipo de hábito')}</legend>
        <div className="form-grid two">
          <label>
            <input type="radio" name="mode" value="check" checked={!quantity} onChange={() => setMode('check')}
              aria-labelledby="habit-check-label" aria-describedby="habit-check-help" />
            <span><strong id="habit-check-label">{t('Fijo')}</strong><small id="habit-check-help">{t('Marca si lo hiciste.')}</small></span>
          </label>
          <label>
            <input type="radio" name="mode" value="quantity" checked={quantity} onChange={() => setMode('quantity')}
              aria-labelledby="habit-counter-label" aria-describedby="habit-counter-help" />
            <span><strong id="habit-counter-label">{t('Con contador')}</strong><small id="habit-counter-help">{t('Suma o resta hasta tu meta diaria.')}</small></span>
          </label>
        </div>
      </fieldset>
      <div className="form-grid two" hidden={!quantity}>
        <Field label={t('Meta diaria')} name="target" value={item?.target ?? 1} type="number" min={1} max={9999} inputMode="numeric" disabled={!quantity} required={quantity} />
        <Field label={t('Unidad')} name="unit" value={unit} maxLength={25} pattern={'.*\\S.*'} placeholder={t('Ej. vasos')}
          disabled={!quantity} required={quantity} />
      </div>
      <fieldset className="icon-selection"><legend>{t('Ícono')}</legend><div>
        {Object.entries(habitIcons).map(([id, name]) => <label key={id}>
          <input type="radio" name="icon" value={id} defaultChecked={(item?.icon ?? 'target') === id} />
          <span className={'habit-icon kind-' + id} title={t(name)}><Icon name={id} /><span className="sr-only">{t(name)}</span></span>
        </label>)}
      </div></fieldset>
      <Field label={t('Detalle (opcional)')} name="note" value={item?.note} maxLength={100} placeholder={t('Ej. 15 minutos al aire libre')} />
      <FormError error={error} />
      <footer className="modal-footer">
        <Button action="close-modal" disabled={pending}>{t('Cancelar')}</Button>
        <button type="submit" className="button primary" disabled={pending}>{item ? t('Guardar cambios') : t('Crear hábito')}</button>
      </footer>
    </form>
  </>;
}

function VideoPlayer({ url, name }: Pick<Exercise, 'name'> & { url: string }) {
  const { t } = useLanguage();
  const parsed = new URL(url);
  const youtube = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(parsed.hostname);
  const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1)
    : parsed.searchParams.get('v') ?? parsed.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)\/?$/)?.[1];
  const vimeo = ['www.vimeo.com', 'vimeo.com', 'player.vimeo.com'].includes(parsed.hostname)
    ? parsed.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1] : '';
  const embed = youtube && id && /^[\w-]{11}$/.test(id) ? 'https://www.youtube-nocookie.com/embed/' + id
    : vimeo ? 'https://player.vimeo.com/video/' + vimeo + '?dnt=1' : '';
  const label = t('Demostración de {name}', { name });
  return <>
    {embed ? <iframe src={embed} title={label} referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture" allowFullScreen />
      : /\.(?:mp4|webm|ogv)$/i.test(parsed.pathname) && <video controls preload="metadata" src={url} aria-label={label} />}
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-link">{t('Abrir video en otra pestaña')} <Icon name="upRight" /><span className="sr-only">{t(' de {name}', { name })}</span></a>
  </>;
}

function ExerciseDetail({ exercise, index, startRest }: { exercise: Exercise; index: number; startRest: (seconds: number) => void }) {
  const { t } = useLanguage();
  const [showVideo, setShowVideo] = useState(false);
  const videoId = 'video-' + index;
  return <li>
    <div className="exercise-title"><span>{index + 1}</span><h3>{exercise.name}</h3></div>
    <div className="exercise-meta"><span>{plural(exercise.sets, t('serie'), t('series'))}</span>
      <span>{plural(exercise.reps, t('repetición'), t('repeticiones'))}</span><span>{exercise.rest} {t('s de descanso')}</span>
    </div>
    {exercise.details && <p>{exercise.details}</p>}
    <div className="exercise-actions">
      {exercise.video && <Button glyph="play" aria-expanded={showVideo} aria-controls={videoId} onClick={() => setShowVideo(!showVideo)}>
        {showVideo ? t('Ocultar video') : t('Ver video')}
      </Button>}
      {exercise.rest > 0 && <Button glyph="clock" onClick={() => startRest(exercise.rest)}>{t('Iniciar descanso')}</Button>}
    </div>
    {exercise.video && <div className="exercise-video" id={videoId} hidden={!showVideo}>
      {showVideo && <VideoPlayer url={exercise.video} name={exercise.name} />}
    </div>}
  </li>;
}

function RestTimer({ timer, stop }: { timer: Rest; stop: () => void }) {
  const { t } = useLanguage();
  const [remaining, setRemaining] = useState(timer.seconds);
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    element.current?.scrollIntoView({ block: 'nearest' });
    const interval = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) clearInterval(interval);
    }, 250);
    return () => clearInterval(interval);
  }, [timer]);
  const display = Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0');
  return <div id="rest-timer" ref={element} className="rest-timer">
    <div><strong>{t('Descanso')}</strong> <span id="rest-time" role="timer" aria-live={remaining ? undefined : 'polite'}>{remaining ? display : t('Descanso terminado')}</span></div>
    <Button className="text-button" onClick={stop}>{t('Detener')}</Button>
  </div>;
}

function WorkoutDetail({ item, pending, error }: FormStatus & { item: Workout }) {
  const calendar = useCalendar();
  const { t } = useLanguage();
  const [timer, setTimer] = useState<Rest | null>(null);
  const timerKey = useRef(0);
  function startRest(seconds: number) {
    setTimer({ seconds, end: Date.now() + seconds * 1000, key: timerKey.current++ });
  }
  return <>
    <ModalHeader title={item.name} note={calendar.day(item.day) + ' · ' + calendar.time(item.time) + ' · ' + item.duration + ' min'} />
    <div className="modal-content">
      <p className="detail-tags"><span><Icon name={item.done ? 'check' : 'strength'} />{t(item.done ? 'Completada' : item.category)}</span>
        <span>{plural(item.exercises.length, t('ejercicio'), t('ejercicios'))}</span>
      </p>
      {item.notes && <p className="session-notes">{item.notes}</p>}
      <ol className="exercise-list">{item.exercises.map((exercise, index) =>
        <ExerciseDetail key={index} exercise={exercise} index={index} startRest={startRest} />)}</ol>
      {timer && <RestTimer key={timer.key} timer={timer} stop={() => setTimer(null)} />}
      <FormError error={error} />
      <footer className="modal-footer details-footer">
        <IconButton action="delete-workout" glyph="trash" label={t('Eliminar sesión')} data-id={item.id} disabled={pending} />
        <Button action="edit-workout" glyph="edit" data-id={item.id} disabled={pending}>{t('Editar')}</Button>
        <Button action="workout-done" className="button primary" glyph="check" data-id={item.id} disabled={pending}>
          {item.done ? t('Desmarcar sesión') : t('Completar sesión')}
        </Button>
      </footer>
    </div>
  </>;
}

function ConfirmAction({ item, habit, pending, error }: FormStatus & { item: Pick<Habit, 'id' | 'name'>; habit: boolean }) {
  const { t } = useLanguage();
  const title = habit ? t('Quitar hábito') : t('Eliminar sesión');
  const note = habit ? t('Se quitará del registro diario desde hoy y se guardará el historial de días anteriores.')
    : t('Esta sesión y sus ejercicios se eliminarán de tu agenda.');
  return <>
    <ModalHeader title={title} />
    <div className="modal-content">
      <p><strong>{item.name}</strong></p><p>{note}</p>
      <FormError error={error} />
      <footer className="modal-footer">
        <Button action={habit ? 'close-modal' : 'view-workout'} data-id={item.id} disabled={pending}>{t('Cancelar')}</Button>
        <Button action={habit ? 'confirm-archive' : 'confirm-delete'} className="button danger solid" data-id={item.id} disabled={pending}>{title}</Button>
      </footer>
    </div>
  </>;
}

export function DialogContent({ modal, ...status }: FormStatus & { modal: PlannerDialog }) {
  if (modal.kind === 'workout-form') return <WorkoutForm day={modal.day} item={modal.item} {...status} />;
  if (modal.kind === 'habit-form') return <HabitForm item={modal.item} {...status} />;
  if (modal.kind === 'workout-detail') return <WorkoutDetail item={modal.item} {...status} />;
  return <ConfirmAction item={modal.item} habit={modal.kind === 'archive-habit'} {...status} />;
}
