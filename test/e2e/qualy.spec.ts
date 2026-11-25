import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test('landing account links lead to a private planner and sign-out returns home', async ({ page }) => {
  const email = 'qualy-' + randomUUID() + '@example.test';
  const password = 'una frase larga de prueba';
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL('/cuenta?modo=registro');
  await page.getByLabel('Nombre', { exact: true }).fill('Cuenta de prueba');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page).toHaveURL('/hoy');
  await expect(page.getByRole('heading', { name: 'Tu día, en orden.' })).toBeVisible();
  await expect(page.getByText('Espacio privado')).toBeVisible();

  await page.getByRole('link', { name: 'Entrenamientos', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva sesión' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre de la sesión').fill('Fuerza de prueba');
  await dialog.getByLabel('Nombre del ejercicio').fill('Sentadillas');
  await dialog.getByRole('button', { name: 'Crear sesión' }).click();
  await expect(dialog).toBeHidden();

  const workout = page.getByRole('button', { name: 'Ver Fuerza de prueba' });
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
  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL('/cuenta');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL('/hoy');
  await expect(page.getByText('Espacio privado')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fuerza de prueba' })).toBeVisible();
});

test('the bilingual landing renders without requesting planner state', async ({ page }) => {
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
  await expect(page.getByText('Hoy en la demo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Find your weekly rhythm.' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'How it works' })).toHaveCount(0);
  await expect(page.getByText('Today in the demo', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly progress' })).toBeVisible();
  expect(stateRequests).toBe(0);

  await page.unroute('**/api/state');
  await page.getByRole('link', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL('/hoy');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Your day, in order.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Full-body strength' })).toBeVisible();
});

test('the mobile demo habit counter and language preference persist', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Probar la demo' }).click();
  await expect(page).toHaveURL('/hoy');
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
