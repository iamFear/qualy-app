import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const password = 'Clave12!';
const spanishName = 'Ana María López';

async function registerInSpanish(page: Page, email: string) {
  await page.getByLabel('Nombre', { exact: true }).fill(spanishName);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page).toHaveURL('/hoy');
}

test('registration starts an empty private planner and preserves workouts and habits across sign-out', async ({ page }) => {
  const email = 'qualy-' + randomUUID() + '@example.test';
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL('/cuenta?modo=registro');
  await registerInSpanish(page, email);
  const greeting = page.getByRole('heading', { name: `Hola, ${spanishName}`, exact: true });
  await expect(greeting).toBeVisible();
  await expect(page.getByText('Espacio privado')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sin sesión programada' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sin hábitos para este día' })).toBeVisible();
  const initialState = await page.request.get('/api/state');
  expect(initialState.status()).toBe(200);
  expect(await initialState.json()).toMatchObject({ user: { name: spanishName, email }, workouts: [], habits: [], logs: [] });

  const workoutName = 'Fuerza de prueba';
  await page.getByRole('button', { name: 'Programar sesión' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre de la sesión').fill(workoutName);
  await dialog.getByLabel('Nombre del ejercicio').fill('Sentadillas');
  await dialog.getByRole('button', { name: 'Crear sesión' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: workoutName })).toBeVisible();

  const habitName = 'Pausa activa';
  await page.getByRole('button', { name: 'Crear hábito' }).click();
  await dialog.getByLabel('Nombre del hábito').fill(habitName);
  await dialog.getByRole('button', { name: 'Crear hábito' }).click();
  await expect(dialog).toBeHidden();
  const habit = page.getByRole('button', { name: habitName, exact: true });
  await habit.click();
  await expect(habit).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('link', { name: 'Entrenamientos', exact: true }).click();
  const workout = page.getByRole('button', { name: 'Ver ' + workoutName });
  await workout.click();
  await expect(dialog.getByText('Sentadillas', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Completar sesión' }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await workout.click();
  await expect(dialog.getByRole('button', { name: 'Desmarcar sesión' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cerrar ventana' }).click();

  await page.getByRole('link', { name: 'Mi cuenta', exact: true }).click();
  const accountEmail = page.getByText(email, { exact: true });
  const logout = page.getByRole('button', { name: 'Cerrar sesión' });
  await expect(accountEmail).toBeVisible();

  await page.route('**/api/logout', (route) => route.abort());
  await logout.click();
  await expect(page.getByText('No pudimos conectar con Qualy. Intenta de nuevo.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL('/cuenta');
  await expect(accountEmail).toBeVisible();
  await page.unroute('**/api/logout');

  await page.route('**/api/state', (route) => route.abort());
  const [logoutResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/logout') && response.request().method() === 'POST'),
    logout.click(),
  ]);
  expect(logoutResponse.ok()).toBe(true);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Dale ritmo a tu semana.' })).toBeVisible();
  await expect(accountEmail).toHaveCount(0);
  await page.unroute('**/api/state');
  const privateState = await page.request.get('/api/state');
  expect(privateState.status()).toBe(401);

  await page.goBack();
  await expect(page).toHaveURL('/cuenta');
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await expect(page.getByText(workoutName, { exact: true })).toHaveCount(0);
  await expect(accountEmail).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();

  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL('/hoy');
  await expect(greeting).toBeVisible();
  await expect(page.getByText('Espacio privado')).toBeVisible();
  await expect(page.getByRole('heading', { name: workoutName })).toBeVisible();
  await expect(habit).toHaveAttribute('aria-pressed', 'true');
});

test('guests are redirected from private sections to sign-in', async ({ page }) => {
  for (const path of ['/hoy', '/agenda', '/entrenamientos', '/habitos']) {
    await page.goto(path);
    await expect(page).toHaveURL('/cuenta');
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Menú principal' })).toHaveCount(0);
  }
});

test('the public landing and account forms work in English without planner state', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  let stateRequests = 0;
  await page.route('**/api/state', async (route) => {
    stateRequests++;
    await route.abort();
  });
  await page.goto('/');
  const header = page.getByRole('banner');
  await expect(page.getByRole('heading', { name: 'Dale ritmo a tu semana.' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Cómo funciona' })).toHaveCount(0);
  await expect(page.getByText(/\bdemo\b/i)).toHaveCount(0);
  await expect(page.locator('a[href="/hoy"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Find your weekly rhythm.' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'How it works' })).toHaveCount(0);
  await expect(page.getByText(/\bdemo\b/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Weekly progress' })).toBeVisible();

  await page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/cuenta');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const email = 'qualy-' + randomUUID() + '@example.test';
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText('The email or password is incorrect.');
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL('/cuenta?modo=registro');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  expect(stateRequests).toBe(0);
  await page.unroute('**/api/state');

  const name = 'Jamie Taylor';
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL('/hoy');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: `Hello, ${name}`, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No workout scheduled' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No habits for this day' })).toBeVisible();
});

test('the mobile habit counter and language preference persist', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cuenta?modo=registro');
  await registerInSpanish(page, 'qualy-' + randomUUID() + '@example.test');
  await page.getByRole('link', { name: 'Hábitos', exact: true }).click();
  const habitName = 'Lectura de prueba';
  const row = page.getByRole('listitem').filter({ hasText: habitName });
  await page.getByRole('button', { name: 'Agregar hábito' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre del hábito').fill(habitName);
  await dialog.getByRole('radio', { name: 'Con contador' }).check();
  await dialog.getByLabel('Meta diaria', { exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Crear hábito' }).click();
  await expect(dialog).toBeHidden();

  await row.getByRole('button', { name: 'Añadir una unidad de ' + habitName }).click();
  await expect(row.getByText('1 / 2 veces')).toBeVisible();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Habits', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(row.getByText('1 / 2 times')).toBeVisible();
  await row.getByRole('button', { name: 'Remove one unit from ' + habitName }).click();
  await expect(row.getByText('0 / 2 times')).toBeVisible();
  await row.getByRole('button', { name: 'Remove ' + habitName, exact: true }).click();
  await dialog.getByRole('button', { name: 'Remove habit' }).click();
  await expect(row).toHaveCount(0);
});
