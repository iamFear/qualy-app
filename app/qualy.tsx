'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent, ReactNode } from 'react';
import type { Locale } from '../lib/i18n.ts';
import type { PlannerState, QualyState } from '../lib/models.ts';
import type { Section } from '../lib/sections.ts';
import type { PlannerDialog } from './dialogs.tsx';
import { useRouter } from 'next/navigation';
import { addDays } from '../lib/dates.ts';
import { localizeDemo } from '../lib/demo-language.ts';
import { defaultHabitUnit } from '../lib/options.ts';
import { LanguageSwitch, useLanguage } from './language.tsx';
import { DialogContent } from './dialogs.tsx';
import { Icon } from './ui-icon.tsx';
import { Account, Agenda, Habits, Shell, Today, Workouts } from './views.tsx';

type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type LoadStatus = { pending: boolean; error: string };
type PlannerContext = {
  state: PlannerState | null;
  day: string | undefined;
  loadStatus: LoadStatus;
  retryLoad: () => void;
  pending: boolean;
  changeView: (route: Section, register: boolean) => void;
  authError: string;
};
type MutationOptions = {
  scope?: 'auth';
  close?: boolean;
  clearState?: boolean;
  message?: string;
  personal?: boolean;
  after?: () => void;
};

const QualyContext = createContext<PlannerContext | null>(null);
const workoutsEndpoint = (id: string) => '/api/workouts/' + encodeURIComponent(id);
const habitsEndpoint = (id: string) => '/api/habits/' + encodeURIComponent(id);
const views = { '/hoy': Today, '/agenda': Agenda, '/entrenamientos': Workouts, '/habitos': Habits, '/cuenta': Account };

function request(path: '/api/state'): Promise<QualyState>;
function request(path: string, method: WriteMethod, body?: object): Promise<void>;
async function request(path: string, method: WriteMethod | 'GET' = 'GET', body: object = {}): Promise<QualyState | void> {
  const response = await fetch(path, method === 'GET' ? { cache: 'no-store' } : {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Qualy-Request': '1' },
    body: JSON.stringify(body),
  }).catch(() => null);
  const value: unknown = await response?.json().catch(() => null);
  if (!response?.ok || !value) {
    const message = value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : undefined;
    throw new Error(message ?? 'No pudimos conectar con Qualy. Intenta de nuevo.');
  }
  if (method === 'GET') return value as QualyState;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.';
}

function selectorFor(node: Element | null) {
  if (!(node instanceof HTMLElement)) return '';
  if (node.dataset.action) {
    const { action, id, day } = node.dataset;
    return '[data-action="' + CSS.escape(action) + '"]'
      + (id ? '[data-id="' + CSS.escape(id) + '"]' : '')
      + (day ? '[data-day="' + CSS.escape(day) + '"]' : '');
  }
  return node.hasAttribute('data-route') ? '[data-route][href="' + CSS.escape(node.getAttribute('href') ?? '') + '"]' : '';
}

function workoutFrom(form: HTMLFormElement) {
  const fields = new FormData(form);
  return {
    name: fields.get('name'), day: String(fields.get('day') ?? ''), time: fields.get('time'),
    category: fields.get('category'), duration: Number(fields.get('duration')), notes: fields.get('notes'),
    exercises: Array.from(form.querySelectorAll('.exercise-fields'), (group) => {
      const value = (name: string) => group.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="' + name + '"]')?.value ?? '';
      return {
        name: value('exercise-name'), sets: Number(value('sets')), reps: Number(value('reps')),
        rest: Number(value('rest')), details: value('details'), video: value('video'),
      };
    }),
  };
}

function habitFrom(form: HTMLFormElement) {
  const fields = new FormData(form);
  const quantity = fields.get('mode') === 'quantity';
  return {
    name: fields.get('name'), icon: fields.get('icon'), note: fields.get('note'),
    target: quantity ? Number(fields.get('target')) : 1, unit: quantity ? String(fields.get('unit') ?? '') : '',
  };
}

export function QualyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [state, setState] = useState<QualyState | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>({ pending: true, error: '' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modal, setModal] = useState<PlannerDialog | null>(null);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState<{ locale: Locale; wording: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState({ message: '', visible: false, error: false });
  const busy = useRef(false);
  const app = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef('');
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previousView = useRef<string | null>(null);
  const day = selectedDay ?? state?.today;
  const displayState = useMemo(() => state ? localizeDemo(state, locale) : null, [state, locale]);

  useEffect(() => {
    let active = true;
    request('/api/state').then(
      (value) => { if (active) setState(value); },
      (failure: unknown) => { if (active) setLoadStatus({ pending: false, error: errorMessage(failure) }); },
    );
    return () => { active = false; };
  }, [loadAttempt]);

  useEffect(() => () => clearTimeout(toastTimeout.current), []);

  function retryLoad() {
    setLoadStatus((current) => ({ ...current, pending: true }));
    setLoadAttempt((attempt) => attempt + 1);
  }

  const focusControl = useCallback((selector?: string) => {
    requestAnimationFrame(() => {
      const target = selector && Array.from(app.current?.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(selector) ?? [])
        .find((element) => element.getClientRects().length && !(element instanceof HTMLButtonElement && element.disabled));
      (target || app.current?.querySelector('main'))?.focus({ preventScroll: true });
    });
  }, []);

  const closeModal = useCallback((restoreFocus = true) => {
    if (dialog.current?.open && restoreFocus) focusControl(returnFocus.current);
    returnFocus.current = '';
    setModal(null);
  }, [focusControl]);

  const changeView = useCallback((route: Section, register: boolean) => {
    const view = route + (register ? '?modo=registro' : '');
    const previous = previousView.current;
    if (previous === view) return;
    previousView.current = view;
    setAuthError(null);
    if (!previous) return;
    if (route === '/hoy') setSelectedDay(null);
    if (!busy.current) closeModal(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!dialog.current?.open || !busy.current) focusControl();
  }, [closeModal, focusControl]);

  function announce(message: string, isError = false) {
    clearTimeout(toastTimeout.current);
    setNotice({ message, visible: true, error: isError });
    toastTimeout.current = setTimeout(() => setNotice((current) => ({ ...current, visible: false })), 4200);
  }

  function showModal(next: PlannerDialog) {
    if (!dialog.current?.open) returnFocus.current = selectorFor(document.activeElement);
    setError('');
    setModal(next);
  }

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!modal) {
      if (element.open) element.close();
      return;
    }
    if (!element.open) element.showModal();
    (element.querySelector<HTMLInputElement>('[data-autofocus]') ?? element.querySelector<HTMLButtonElement>('.modal-header button'))?.focus();
    element.scrollTop = 0;
  }, [modal]);

  function refresh(next: QualyState) {
    if (day === state?.today) setSelectedDay(null);
    setState(next);
  }

  async function mutate(button: HTMLButtonElement | null, action: () => Promise<void>,
    { scope, close = false, clearState = false, message, personal = true, after }: MutationOptions = {}) {
    if (busy.current || !state) return;
    busy.current = true;
    const inModal = dialog.current?.contains(button);
    const focus = selectorFor(button);
    if (button) button.disabled = true;
    setPending(true);
    if (scope === 'auth') setAuthError(null);
    if (inModal) setError('');
    let saved = false;
    let signedIn = state.signedIn;
    try {
      if (personal && !signedIn) {
        await request('/api/demo', 'POST');
        signedIn = true;
      }
      try {
        await action();
      } catch (failure) {
        const latest = await request('/api/state').catch(() => null);
        if (latest && signedIn) {
          refresh(latest);
          if (!latest.signedIn) throw new Error('Tu sesión venció. Inicia sesión o vuelve a la demo para continuar.');
        }
        throw failure;
      }
      saved = true;
      if (clearState) {
        setState(null);
        setSelectedDay(null);
      } else {
        refresh(await request('/api/state'));
      }
      if (close) closeModal();
      else if (!inModal && focus) focusControl(focus);
      if (after) after();
      if (message) announce(message);
    } catch (failure) {
      const wording = saved ? 'El cambio se guardó. Recarga la página para ver el resultado.' : errorMessage(failure);
      if (scope === 'auth') setAuthError({ locale, wording });
      else if (inModal) setError(wording);
      else announce(wording, !saved);
      requestAnimationFrame(() => { if (button?.isConnected) button.focus({ preventScroll: true }); });
    } finally {
      if (button?.isConnected) button.disabled = false;
      busy.current = false;
      setPending(false);
    }
  }

  function selectDay(date: string, focus?: string) {
    setSelectedDay(date === state?.today ? null : date);
    if (focus) focusControl(focus);
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (!state || !displayState || !day || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled || busy.current) return;
    const { action, id, day: forDay } = button.dataset;
    const workout = id ? displayState.workouts.find((item) => item.id === id) : undefined;
    const habit = id ? displayState.habits.find((item) => item.id === id) : undefined;

    switch (action) {
      case 'day': if (forDay) selectDay(forDay); break;
      case 'today': selectDay(state.today, '[data-action="day"][data-day="' + state.today + '"]'); break;
      case 'week-back': selectDay(addDays(day, -7)); break;
      case 'week-next': selectDay(addDays(day, 7)); break;
      case 'new-workout': showModal({ kind: 'workout-form', day: forDay ?? day }); break;
      case 'view-workout': if (workout) showModal({ kind: 'workout-detail', item: workout }); break;
      case 'edit-workout': if (workout) showModal({ kind: 'workout-form', item: workout }); break;
      case 'delete-workout': if (workout) showModal({ kind: 'delete-workout', item: workout }); break;
      case 'new-habit': showModal({ kind: 'habit-form' }); break;
      case 'edit-habit': if (habit) showModal({ kind: 'habit-form', item: habit }); break;
      case 'archive-habit': if (habit) showModal({ kind: 'archive-habit', item: habit }); break;
      case 'confirm-delete':
        if (workout) void mutate(button, () => request(workoutsEndpoint(workout.id), 'DELETE'), { close: true, message: 'Sesión eliminada.' });
        break;
      case 'workout-done':
        if (workout) void mutate(button, () => request(workoutsEndpoint(workout.id) + '/done', 'PATCH', { done: !workout.done }),
          { close: true, message: workout.done ? 'Sesión pendiente.' : 'Sesión completada.' });
        break;
      case 'confirm-archive':
        if (habit) void mutate(button, () => request(habitsEndpoint(habit.id), 'DELETE'), { close: true, message: 'Hábito quitado.' });
        break;
      case 'habit-plus':
      case 'habit-minus':
      case 'habit-toggle': {
        if (!id || !forDay) break;
        const value = action === 'habit-toggle' ? { done: button.getAttribute('aria-pressed') !== 'true' }
          : { delta: action === 'habit-plus' ? 1 : -1 };
        void mutate(button, () => request(habitsEndpoint(id) + '/log', 'PATCH', { day: forDay, ...value }), { message: 'Progreso actualizado.' });
        break;
      }
      case 'close-modal': closeModal(); break;
      case 'logout':
        void mutate(button, () => request('/api/logout', 'POST'), {
          personal: false, clearState: true, close: true, after: () => router.replace('/'), message: 'Sesión cerrada.',
        });
        break;
    }
  }

  function onSubmit(event: FormEvent<HTMLDivElement>) {
    event.preventDefault();
    const form = event.target;
    if (!state || !displayState || !(form instanceof HTMLFormElement)) return;
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const button = submitter instanceof HTMLButtonElement ? submitter : form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const id = form.dataset.id;
    if (form.id === 'auth-form') {
      const register = form.dataset.mode === 'registro';
      const data = Object.fromEntries(new FormData(form));
      if (typeof data.email === 'string') data.email = data.email.trim();
      void mutate(button, () => request(register ? '/api/register' : '/api/login', 'POST', data), {
        personal: false, scope: 'auth', after: () => router.replace('/hoy'),
        message: register ? 'Tu cuenta está lista.' : 'Sesión iniciada.',
      });
    }
    if (form.id === 'workout-form') {
      const item = workoutFrom(form);
      void mutate(button, () => request(id ? workoutsEndpoint(id) : '/api/workouts', id ? 'PUT' : 'POST', item), {
        close: true, message: id ? 'Sesión actualizada.' : 'Sesión creada.', after: () => setSelectedDay(item.day),
      });
    }
    if (form.id === 'habit-form') {
      const item = habitFrom(form);
      const displayedHabit = id ? displayState.habits.find((habit) => habit.id === id) : undefined;
      const storedHabit = displayedHabit && state.habits.find((habit) => habit.id === displayedHabit.id);
      if (storedHabit && item.unit && item.unit === displayedHabit?.unit) {
        item.unit = storedHabit.unit;
      } else if (item.unit?.trim() === t(defaultHabitUnit)) {
        item.unit = defaultHabitUnit;
      }
      void mutate(button, () => request(id ? habitsEndpoint(id) : '/api/habits', id ? 'PUT' : 'POST', item), {
        close: true, message: id ? 'Hábito actualizado.' : 'Hábito creado.', after: () => { if (!id) setSelectedDay(null); },
      });
    }
  }

  return <QualyContext.Provider value={{
    state: displayState, day, loadStatus, retryLoad, pending, changeView,
    authError: authError?.locale === locale ? authError.wording : '',
  }}>
    <div id="app" ref={app} onClick={onClick} onSubmit={onSubmit}>
      {children}
      <dialog ref={dialog} id="modal" aria-labelledby="modal-title" aria-busy={modal && pending ? true : undefined}
        onCancel={(event) => { event.preventDefault(); if (!busy.current) closeModal(); }}>
        {modal && <DialogContent key={modal.kind + (modal.item?.id ?? '')} modal={modal} error={t(error)} pending={pending} />}
      </dialog>
    </div>
    <div id="status" className={'toast' + (notice.visible ? ' show' : '') + (notice.error ? ' bad' : '')} role="status">{t(notice.message)}</div>
  </QualyContext.Provider>;
}

function usePlanner() {
  const planner = useContext(QualyContext);
  if (!planner) throw new Error('QualyPage requires QualyProvider.');
  return planner;
}

export function QualyPage({ route, register }: { route: Section; register: boolean }) {
  const { t } = useLanguage();
  const { state, day, loadStatus, retryLoad, pending, authError, changeView } = usePlanner();
  useEffect(() => changeView(route, register), [changeView, route, register]);

  if (!state) {
    return <>
      <header className="standalone-topbar"><LanguageSwitch /></header>
      <main className="loading" id="contenido" aria-busy={loadStatus.pending}>
        <strong>qualy.</strong>
        <p role="status">{t(loadStatus.pending ? 'Cargando tu espacio…' : loadStatus.error)}</p>
        {loadStatus.error && <button type="button" className="button primary" onClick={retryLoad} disabled={loadStatus.pending}>
          {t('Volver a cargar')} <Icon name="redo" />
        </button>}
      </main>
    </>;
  }
  const View = views[route];
  return <Shell route={route} state={state}>
    <View state={state} day={day ?? state.today} register={register} error={t(authError)} pending={pending} />
  </Shell>;
}
