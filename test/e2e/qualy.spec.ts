import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test('a private account can plan and complete a workout', async ({ page }) => {
  await page.goto('/cuenta?modo=registro');
  await page.getByLabel('Nombre', { exact: true }).fill('Cuenta de prueba');
  await page.getByLabel('Correo electrónico').fill('qualy-' + randomUUID() + '@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('una frase larga de prueba');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Tu día, en orden.' })).toBeVisible();

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
});

test('the mobile habit counter and language preference persist', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/habitos');
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
