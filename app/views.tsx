import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { PlannerState, Workout } from '../lib/models.ts';
import type { Section } from '../lib/sections.ts';
import { weekOf } from '../lib/dates.ts';
import { defaultHabitUnit } from '../lib/options.ts';
import { titles } from '../lib/sections.ts';
import { BrandMark } from './brand-mark.tsx';
import { Icon } from './ui-icon.tsx';
import { LanguageSwitch, useLanguage } from './language.tsx';
import { useCalendar } from './format-language.ts';

export const plural = (count: number, singular: string, multiple: string) => count + ' ' + (count === 1 ? singular : multiple);
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('es-CO')).join('');
const navItems = [['/hoy', 'home'], ['/agenda', 'calendar'], ['/entrenamientos', 'strength'], ['/habitos', 'habits']] as const;

type DayView = { state: PlannerState; day: string };
type ButtonProps = ComponentPropsWithoutRef<'button'> & { action?: string; glyph?: string };
type IconButtonProps = ButtonProps & { glyph: string; label: string };

export function Button({ action, children, glyph, className = 'button secondary', ...props }: ButtonProps) {
  return <button type="button" className={className} data-action={action} {...props}>
    {glyph && <Icon name={glyph} />}<span>{children}</span>
  </button>;
}

export function IconButton({ action, glyph, label, ...props }: IconButtonProps) {
  return <button type="button" className="icon-button" data-action={action} aria-label={label} {...props}>
    <Icon name={glyph} />
  </button>;
}

function ActionLink({ href, children, glyph = 'arrow', className = 'text-link' }: {
  href: Section; children: ReactNode; glyph?: string; className?: string;
}) {
  return <Link className={className} href={href} data-route="">{children}<Icon name={glyph} /></Link>;
}

function Empty({ glyph, title, description, children }: { glyph: string; title: string; description: string; children?: ReactNode }) {
  return <div className="panel empty">
    <span className="empty-icon"><Icon name={glyph} /></span><h3>{title}</h3><p>{description}</p>{children}
  </div>;
}

export function Shell({ route, state, children }: { route: Section; state: PlannerState; children: ReactNode }) {
  const { t } = useLanguage();
  const account = state.user;
  const isAccount = route === '/cuenta';
  return <>
    <aside className="sidebar">
      <Link href="/hoy" className="brand" aria-label={t('Qualy, ir a Hoy')} data-route="">
        <BrandMark size={36} /><span>Qualy</span>
      </Link>
      <nav aria-label={t('Menú principal')}>
        <div className="nav-list">{navItems.map(([href, glyph]) =>
          <Link key={href} href={href} data-route="" aria-current={route === href ? 'page' : undefined}>
            <Icon name={glyph} /><span>{t(titles[href])}</span>
          </Link>)}</div>
      </nav>
      <div className="sidebar-bottom">
        <Link href="/cuenta" className={'profile' + (isAccount ? ' selected' : '')} data-route="" aria-current={isAccount ? 'page' : undefined}>
          <span className="avatar">{account ? initials(account.name) : <Icon name="user" />}</span>
          <span className="profile-copy"><strong>{account ? account.name : t('Invitado')}</strong><small>{account ? t('Mi cuenta') : t('Iniciar sesión')}</small></span>
          <Icon name="right" className="profile-arrow" />
        </Link>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="topbar-inner">
        <Link href="/hoy" className="brand mobile-brand" aria-label={t('Qualy, ir a Hoy')} data-route="">
          <BrandMark size={31} /><span>Qualy</span>
        </Link>
        <div className="breadcrumb"><span>{t('Mi espacio')}</span><Icon name="right" /><strong>{t(titles[route])}</strong></div>
        <div className="topbar-actions">
          <LanguageSwitch />
          {state.demo ? <span className="demo-tag"><span />{t('Modo demo')}</span> : <span className="private-tag"><Icon name="lock" /> {t('Espacio privado')}</span>}
          {state.demo && !isAccount && <Link className="button top-button" href="/cuenta?modo=registro" data-route="">{t('Crear cuenta')}</Link>}
          {account && <Link className="top-avatar avatar" href="/cuenta" aria-label={t('Mi cuenta')} data-route="">{initials(account.name)}</Link>}
        </div>
      </div></header>
      <main id="contenido" className="content" tabIndex={-1}>{children}</main>
    </div>
  </>;
}

function Intro({ title, description, date, children }: { title: string; description: string; date?: string; children?: ReactNode }) {
  const calendar = useCalendar();
  return <div className="page-intro">
    <div>
      {date && <p className="date-label"><Icon name="calendar" /><time dateTime={date}>{calendar.day(date)}</time></p>}
      <h1>{title}</h1><p>{description}</p>
    </div>{children}
  </div>;
}

function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="section-head"><h2>{title}</h2>{children}</header>;
}

function WeekStrip({ state, day }: DayView) {
  const calendar = useCalendar();
  const { t } = useLanguage();
  const days = weekOf(day);
  const last = days[days.length - 1];
  const fromMonth = calendar.month(days[0]);
  const toMonth = calendar.monthYear(last);
  const label = days[0].slice(0, 7) === last.slice(0, 7) ? toMonth : fromMonth + ' / ' + toMonth;
  return <section className="panel week" aria-label={t('Calendario semanal')}>
    <div className="week-header"><h2>{label}</h2><div className="week-actions">
      {day !== state.today && <Button action="today" className="button day-reset">{t('Hoy')}</Button>}
      <IconButton action="week-back" glyph="left" label={t('Semana anterior')} />
      <IconButton action="week-next" glyph="right" label={t('Semana siguiente')} />
    </div></div>
    <div className="week-days">{days.map((item) => {
      const today = item === state.today;
      const scheduled = state.workouts.some((workout) => workout.day === item);
      return <button key={item} type="button" className={'day' + (item === day ? ' day-selected' : '')}
        data-action="day" data-day={item} aria-label={calendar.day(item) + (today ? t(', hoy') : '') + (scheduled ? ', con entrenamiento' : '')}
        aria-pressed={item === day} aria-current={today ? 'date' : undefined}>
        <span>{calendar.weekday(item)}</span><strong>{Number(item.slice(8))}</strong><i className={scheduled ? 'scheduled' : undefined} aria-hidden="true" />
      </button>;
    })}</div>
  </section>;
}

function NewWorkout() {
  const { t } = useLanguage();
  return <Button action="new-workout" className="button primary" glyph="plus">{t('Nueva sesión')}</Button>;
}

function WorkoutCover({ workout }: { workout: Workout }) {
  const calendar = useCalendar();
  const { t } = useLanguage();
  return <article className="workout-cover"><div className="cover-body">
    <span className="cover-category"><Icon name={workout.done ? 'check' : 'strength'} />{t(workout.done ? 'Completada' : workout.category)}</span>
    <h3>{workout.name}</h3>
    <div className="cover-meta"><span><Icon name="clock" /> {calendar.time(workout.time)}</span>
      <span><Icon name="layers" /> {plural(workout.exercises.length, t('ejercicio'), t('ejercicios'))}</span><span>{workout.duration} min</span>
    </div>
    <Button action="view-workout" className="button lime" glyph="arrow" data-id={workout.id}>{t('Ver sesión')}</Button>
  </div></article>;
}

function WorkoutRow({ workout, showDate = true }: { workout: Workout; showDate?: boolean }) {
  const calendar = useCalendar();
  const { t } = useLanguage();
  return <li className="workout-row">
    <span className="habit-icon kind-target"><Icon name={workout.done ? 'check' : 'strength'} /></span>
    <div className="row-copy"><strong>{workout.name}</strong><small>
      {showDate && calendar.mediumDay(workout.day) + ' · '}{calendar.time(workout.time)} · {workout.duration} min{workout.done && ' · ' + t('Completada')}
    </small></div>
    <IconButton action="view-workout" glyph="right" label={t('Ver {name}', { name: workout.name })} data-id={workout.id} />
  </li>;
}

function habitsFor(state: PlannerState, day: string) {
  const counts = new Map(state.logs.filter((entry) => entry.day === day).map((entry) => [entry.habit_id, entry.amount]));
  return state.habits.filter((habit) => habit.created_on <= day && (!habit.archived_on || day < habit.archived_on))
    .map((habit) => ({ ...habit, count: counts.get(habit.id) ?? 0 }));
}

function HabitsPanel({ state, day, editable }: DayView & { editable?: boolean }) {
  const { t } = useLanguage();
  const habits = habitsFor(state, day);
  if (!habits.length) {
    return <Empty glyph="habits" title={t('Sin hábitos para este día')} description={t('Crea un hábito para empezar a registrar tu progreso.')}>
      {!editable && <Button action="new-habit" glyph="plus">{t('Crear hábito')}</Button>}
    </Empty>;
  }
  const completed = habits.filter((habit) => habit.count >= habit.target).length;
  const upcoming = day > state.today;
  return <div className="panel habit-panel">
    <div className="habit-progress">
      <div><strong>{t('{done} de {total}', { done: completed, total: habits.length })}</strong> <span>{t('completados')}</span></div>
      <span className="habit-percent">{Math.round(completed / habits.length * 100)}%</span>
      <progress value={completed} max={habits.length} aria-label={t('Hábitos completados')} />
    </div>
    {upcoming && <p className="future-note">{t('Podrás registrar estos hábitos cuando llegue el día.')}</p>}
    <ul className="habit-list">{habits.map((habit) => {
      const done = habit.count >= habit.target;
      const data = { 'data-id': habit.id, 'data-day': day };
      const unit = habit.unit === defaultHabitUnit ? t(defaultHabitUnit) : habit.unit;
      const description = unit ? habit.count + ' / ' + habit.target + ' ' + unit : habit.note;
      return <li className={'habit-row' + (editable ? ' habit-row-manage' : '')} key={habit.id}>
        <span className={'habit-icon kind-' + habit.icon}><Icon name={habit.icon} /></span>
        <div className="row-copy">
          <strong>{habit.name}</strong>{description && <small>{description}</small>}
          {editable && unit && <progress className="habit-goal" aria-label={t('Progreso de {name}', { name: habit.name })}
            value={Math.min(habit.count, habit.target)} max={habit.target} />}
        </div>
        {unit ? <div className="counter" role="group" aria-label={t('Registrar {name}', { name: habit.name })}>
          <IconButton action="habit-minus" glyph="minus" label={t('Quitar una unidad de {name}', { name: habit.name })} disabled={upcoming || !habit.count} {...data} />
          <IconButton action="habit-plus" glyph="plus" label={t('Añadir una unidad de {name}', { name: habit.name })} disabled={upcoming || habit.count >= 9999} {...data} />
        </div> : <button type="button" className={'habit-check' + (done ? ' checked' : '')} aria-label={habit.name} aria-pressed={done}
          data-action="habit-toggle" disabled={upcoming} {...data}>{done && <Icon name="check" />}</button>}
        {editable && !habit.archived_on && <div className="habit-tools">
          <Button action="edit-habit" glyph="edit" className="button habit-tool"
            aria-label={t('Editar {name}', { name: habit.name })} {...data}>{t('Editar')}</Button>
          <Button action="archive-habit" glyph="archive" className="button habit-tool habit-remove"
            aria-label={t('Quitar {name}', { name: habit.name })} {...data}>{t('Quitar')}</Button>
        </div>}
      </li>;
    })}</ul>
  </div>;
}

function Summary({ state, day }: DayView) {
  const { t } = useLanguage();
  const days = weekOf(day);
  const weekWorkouts = state.workouts.filter((workout) => days.includes(workout.day));
  const doneWorkouts = weekWorkouts.filter((workout) => workout.done);
  const completedHabits = days.reduce((total, date) => total + habitsFor(state, date).filter((habit) => habit.count >= habit.target).length, 0);
  const loggedDays = state.logs.filter((log) => log.amount > 0 && days.includes(log.day)).map((log) => log.day);
  const active = new Set([...loggedDays, ...doneWorkouts.map((workout) => workout.day)]);
  return <section className="summary">
    <SectionHeader title={t('Resumen de la semana')} />
    <div className="panel summary-grid">
      <div><span className="metric-icon"><Icon name="strength" /></span><div><strong>{doneWorkouts.length}<small> / {weekWorkouts.length}</small></strong><span>{t('Sesiones completadas')}</span></div></div>
      <div><span className="metric-icon"><Icon name="habits" /></span><div><strong>{completedHabits}</strong><span>{t('Hábitos completados')}</span></div></div>
      <div><span className="metric-icon"><Icon name="chart" /></span><div><strong>{active.size}<small> / 7</small></strong><span>{t('Días con actividad')}</span></div></div>
    </div>
  </section>;
}

export function Today({ state, day }: DayView) {
  const { t } = useLanguage();
  const sessions = state.workouts.filter((workout) => workout.day === day);
  const first = sessions.find((workout) => !workout.done) ?? sessions[0];
  const today = state.today === day;
  return <>
    <Intro title={today ? t('Tu día, en orden.') : t('Tu plan del día')}
      description={today ? t('Tu entrenamiento y tus hábitos, en un solo lugar.') : t('Consulta lo que tienes programado y revisa tu progreso.')} date={day}>
      <NewWorkout />
    </Intro>
    <WeekStrip state={state} day={day} />
    <div className="daily-grid">
      <section>
        <SectionHeader title={today ? t('Entrenamiento de hoy') : t('Entrenamiento del día')}><ActionLink href="/entrenamientos">{t('Ver sesiones')}</ActionLink></SectionHeader>
        {first ? <WorkoutCover workout={first} /> : <Empty glyph="strength" title={t('Sin sesión programada')} description={t('Elige qué entrenar y reserva un momento del día.')}>
          <Button action="new-workout" glyph="plus">{t('Programar sesión')}</Button>
        </Empty>}
        {sessions.length > 1 && <ul className="panel workout-list more-workouts">
          {sessions.filter((workout) => workout !== first).map((workout) => <WorkoutRow key={workout.id} workout={workout} showDate={false} />)}
        </ul>}
      </section>
      <section>
        <SectionHeader title={t('Hábitos diarios')}><Button action="new-habit" className="text-button" glyph="plus">{t('Añadir')}</Button></SectionHeader>
        <HabitsPanel state={state} day={day} />
      </section>
    </div>
    <Summary state={state} day={day} />
  </>;
}

export function Agenda({ state, day }: DayView) {
  const calendar = useCalendar();
  const { t } = useLanguage();
  return <>
    <Intro title={t('Agenda')} description={t('Revisa cuándo entrenas y qué tienes previsto para cada día.')}><NewWorkout /></Intro>
    <WeekStrip state={state} day={day} />
    <section className="agenda-block">
      <SectionHeader title={t('Sesiones de la semana')} />
      <div className="panel agenda-list">{weekOf(day).map((date) => {
        const workouts = state.workouts.filter((workout) => workout.day === date);
        return <article key={date} className={'agenda-day' + (date === day ? ' agenda-selected' : '')}>
          <div className="agenda-heading">
            <div><strong>{calendar.day(date)}</strong>{date === state.today && <span>{t('Hoy')}</span>}</div>
            <IconButton action="new-workout" glyph="plus" label={t('Programar sesión para el {day}', { day: calendar.dayInSentence(date) })} data-day={date} />
          </div>
          {workouts.length ? <ul className="workout-list">{workouts.map((workout) => <WorkoutRow key={workout.id} workout={workout} showDate={false} />)}</ul>
            : <p>{t('Sin sesiones programadas')}</p>}
        </article>;
      })}</div>
    </section>
  </>;
}

export function Workouts({ state, day }: DayView) {
  const { t } = useLanguage();
  const planned = state.workouts.filter((workout) => !workout.done);
  const done = state.workouts.filter((workout) => workout.done).reverse();
  return <>
    <Intro title={t('Entrenamientos')} description={t('Crea sesiones y ten a mano los ejercicios, las series y los descansos.')} date={day}><NewWorkout /></Intro>
    <section className="list-section"><SectionHeader title={t('Sesiones pendientes')} />
      {planned.length ? <ul className="panel workout-list">{planned.map((workout) => <WorkoutRow key={workout.id} workout={workout} />)}</ul>
        : <Empty glyph="strength" title={t('Sin sesiones pendientes')} description={t('Programa tu próximo entrenamiento para tenerlo listo.')} />}
    </section>
    <section className="list-section"><SectionHeader title={t('Sesiones completadas')} />
      {done.length ? <ul className="panel workout-list">{done.map((workout) => <WorkoutRow key={workout.id} workout={workout} />)}</ul>
        : <Empty glyph="history" title={t('Tu historial empieza aquí')} description={t('Las sesiones que completes aparecerán en esta sección.')} />}
    </section>
  </>;
}

export function Habits({ state, day }: DayView) {
  const calendar = useCalendar();
  const { t } = useLanguage();
  return <>
    <Intro title={t('Hábitos')} description={t('Define metas diarias y registra tu avance a lo largo de la semana.')}>
      <Button action="new-habit" className="button primary" glyph="plus">{t('Agregar hábito')}</Button>
    </Intro>
    <WeekStrip state={state} day={day} />
    <section className="list-section"><SectionHeader title={t('Hábitos del {day}', { day: calendar.dayInSentence(day) })} /><HabitsPanel state={state} day={day} editable /></section>
    <Summary state={state} day={day} />
  </>;
}

export function Account({ state, register, error, pending }: { state: PlannerState; register: boolean; error: string; pending: boolean }) {
  const { t } = useLanguage();
  if (state.user) return <>
    <Intro title={t('Mi cuenta')} description={t('Administra el acceso a tu espacio personal.')} />
    <div className="panel account-panel">
      <span className="avatar account-avatar">{initials(state.user.name)}</span>
      <h2>{state.user.name}</h2><p>{state.user.email}</p>
      <Button action="logout" glyph="logout" disabled={pending}>{t('Cerrar sesión')}</Button>
    </div>
  </>;
  return <section className="auth-layout"><div className="panel auth-panel">
    <BrandMark size={43} />
    <h1>{register ? t('Crea tu cuenta') : t('Inicia sesión')}</h1>
    <p>{register ? t('Empieza tu propia agenda de entrenamientos y hábitos.') : t('Entra para consultar tu entrenamiento y tus hábitos.')}</p>
    <div className="auth-tabs" aria-label={t('Acceso a Qualy')}>
      <Link href="/cuenta" data-route="" aria-current={!register ? 'page' : undefined}>{t('Iniciar sesión')}</Link>
      <Link href="/cuenta?modo=registro" data-route="" aria-current={register ? 'page' : undefined}>{t('Crear cuenta')}</Link>
    </div>
    <form id="auth-form" key={String(register)} data-mode={register ? 'registro' : 'ingreso'}>
      {register && <label>{t('Nombre')}<input name="name" autoComplete="name" maxLength={70} placeholder={t('Tu nombre')} required /></label>}
      <label>{t('Correo electrónico')}<input name="email" type="email" autoComplete="username" maxLength={254} placeholder={t('tu@correo.com')} required /></label>
      <div className="field"><label>{t('Contraseña')}<input name="password" type="password" minLength={register ? 12 : undefined} maxLength={128}
        autoComplete={register ? 'new-password' : 'current-password'} aria-describedby={register ? 'password-help' : undefined} required /></label>
        {register && <small id="password-help">{t('Usa al menos 12 caracteres.')}</small>}
      </div>
      <p className="form-error" role="alert" hidden={!error}>{error}</p>
      <button className="button primary" type="submit" disabled={pending}>{register ? t('Crear cuenta') : t('Iniciar sesión')} <Icon name="arrow" /></button>
    </form>
    <ActionLink href="/hoy" glyph="left" className="text-link auth-back">{t('Volver a la demo')}</ActionLink>
  </div></section>;
}
