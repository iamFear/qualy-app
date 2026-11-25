'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { PlannerState } from '../lib/models.ts';
import type { Section } from '../lib/sections.ts';
import type { PlannerDialog } from './dialogs.tsx';
import { addDays } from '../lib/dates.ts';
import { defaultHabitUnit } from '../lib/options.ts';
import { ApiError, errorMessage, request } from './api-request.ts';
import { LanguageSwitch, useLanguage } from './language.tsx';
import { DialogContent } from './dialogs.tsx';
import { Icon } from './ui-icon.tsx';
import { Account, Agenda, Habits, Shell, Today, Workouts } from './views.tsx';

type LoadStatus = { pending: boolean; error: string };
type PlannerContext = {
  state: PlannerState | null;
  day: string | undefined;
  loadStatus: LoadStatus;
  retryLoad: () => void;
  pending: boolean;
  changeView: (route: Section) => void;
};
type MutationOptions = {
  close?: boolean;
  logout?: boolean;
  message?: string;
  after?: () => void;
};

const QualyContext = createContext<PlannerContext | null>(null);
const workoutsEndpoint = (id: string) => '/api/workouts/' + encodeURIComponent(id);
const habitsEndpoint = (id: string) => '/api/habits/' + encodeURIComponent(id);
const views = { '/hoy': Today, '/agenda': Agenda, '/entrenamientos': Workouts, '/habitos': Habits, '/cuenta': Account };

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
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
  const { t } = useLanguage();
  const [state, setState] = useState<PlannerState | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>({ pending: true, error: '' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modal, setModal] = useState<PlannerDialog | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState({ message: '', visible: false, error: false });
  const busy = useRef(false);
  const app = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef('');
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previousView = useRef<Section | null>(null);
  const day = selectedDay ?? state?.today;

  const leavePlanner = useCallback((destination: '/' | '/cuenta') => {
    flushSync(() => {
      setState(null);
      setSelectedDay(null);
      setModal(null);
    });
    window.location.replace(destination);
  }, []);

  useEffect(() => {
    let active = true;
    request('/api/state').then(
      (value) => { if (active) setState(value); },
      (failure: unknown) => {
        if (!active) return;
        if (isUnauthorized(failure)) leavePlanner('/cuenta');
        else setLoadStatus({ pending: false, error: errorMessage(failure) });
      },
    );
    return () => { active = false; };
  }, [leavePlanner, loadAttempt]);

  useEffect(() => {
    // A history restore must re-authorize before displaying the saved private document.
    const hide = () => { if (app.current) app.current.hidden = true; };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', restore);
    return () => {
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', restore);
    };
  }, []);

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

  const changeView = useCallback((route: Section) => {
    const previous = previousView.current;
    if (previous === route) return;
    previousView.current = route;
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

  function refresh(next: PlannerState) {
    if (day === state?.today) setSelectedDay(null);
    setState(next);
  }

  async function mutate(button: HTMLButtonElement | null, action: () => Promise<void>,
    { close = false, logout = false, message, after }: MutationOptions = {}) {
    if (busy.current || !state) return;
    busy.current = true;
    const inModal = dialog.current?.contains(button);
    const focus = selectorFor(button);
    if (button) button.disabled = true;
    setPending(true);
    if (inModal) setError('');
    let saved = false;
    try {
      try {
        await action();
      } catch (failure) {
        if (logout || isUnauthorized(failure)) throw failure;
        try {
          refresh(await request('/api/state'));
        } catch (refreshFailure) {
          if (isUnauthorized(refreshFailure)) throw refreshFailure;
        }
        throw failure;
      }
      if (logout) {
        leavePlanner('/');
        return;
      }
      saved = true;
      refresh(await request('/api/state'));
      if (close) closeModal();
      else if (!inModal && focus) focusControl(focus);
      if (after) after();
      if (message) announce(message);
    } catch (failure) {
      if (!logout && isUnauthorized(failure)) {
        leavePlanner('/cuenta');
        return;
      }
      const wording = saved ? 'El cambio se guardó. Recarga la página para ver el resultado.' : errorMessage(failure);
      if (inModal) setError(wording);
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
    if (!state || !day || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled || busy.current) return;
    const { action, id, day: forDay } = button.dataset;
    const workout = id ? state.workouts.find((item) => item.id === id) : undefined;
    const habit = id ? state.habits.find((item) => item.id === id) : undefined;

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
        void mutate(button, () => request('/api/logout', 'POST'), { logout: true });
        break;
    }
  }

  function onSubmit(event: FormEvent<HTMLDivElement>) {
    event.preventDefault();
    const form = event.target;
    if (!state || !(form instanceof HTMLFormElement)) return;
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const button = submitter instanceof HTMLButtonElement ? submitter : form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const id = form.dataset.id;
    if (form.id === 'workout-form') {
      const item = workoutFrom(form);
      void mutate(button, () => request(id ? workoutsEndpoint(id) : '/api/workouts', id ? 'PUT' : 'POST', item), {
        close: true, message: id ? 'Sesión actualizada.' : 'Sesión creada.', after: () => setSelectedDay(item.day),
      });
    }
    if (form.id === 'habit-form') {
      const item = habitFrom(form);
      const storedHabit = id ? state.habits.find((habit) => habit.id === id) : undefined;
      if (item.unit !== storedHabit?.unit && item.unit.trim() === t(defaultHabitUnit)) {
        item.unit = defaultHabitUnit;
      }
      void mutate(button, () => request(id ? habitsEndpoint(id) : '/api/habits', id ? 'PUT' : 'POST', item), {
        close: true, message: id ? 'Hábito actualizado.' : 'Hábito creado.', after: () => { if (!id) setSelectedDay(null); },
      });
    }
  }

  return <QualyContext.Provider value={{ state, day, loadStatus, retryLoad, pending, changeView }}>
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

function PlannerStatus({ pending, error, retry }: LoadStatus & { retry: () => void }) {
  const { t } = useLanguage();
  return <>
    <header className="standalone-topbar"><LanguageSwitch /></header>
    <main className="loading" id="contenido" tabIndex={-1} aria-busy={pending}>
      <strong>qualy.</strong>
      <p role="status">{t(pending ? 'Cargando tu espacio…' : error)}</p>
      {error && <button type="button" className="button primary" onClick={retry} disabled={pending}>
        {t('Volver a cargar')} <Icon name="redo" />
      </button>}
    </main>
  </>;
}

export function PlannerUnavailable() {
  return <PlannerStatus pending={false} error="No pudimos conectar con Qualy. Intenta de nuevo." retry={() => window.location.reload()} />;
}

export function QualyPage({ route }: { route: Section }) {
  const { state, day, loadStatus, retryLoad, pending, changeView } = usePlanner();
  useEffect(() => changeView(route), [changeView, route]);
  if (!state) {
    return <PlannerStatus {...loadStatus} retry={retryLoad} />;
  }
  const View = views[route];
  return <Shell route={route} state={state}>
    <View state={state} day={day ?? state.today} pending={pending} />
  </Shell>;
}
