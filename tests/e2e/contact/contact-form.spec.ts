import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/base-fixture';
import { testConfig, navLinkSelector } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { CREAM_FLAVORS, MAX_CREAM_FLAVORS, MESSAGE_FALLBACK } from '../../../src/config/contact';
import { EMAIL_SUBMIT_EVENT } from '../../../src/utils/contactEnquiry';

async function openContactPage(page: Page) {
  await page.goto(testConfig.routes.kontakt);
  await waitForHydration(page);
}

async function captureEmailSubmissions(page: Page) {
  await page.evaluate((eventName) => {
    const submissions: string[] = [];
    (window as any).__emailSubmissions = submissions;
    document
      .querySelector('[data-contact-form]')!
      .addEventListener(eventName, (event) => submissions.push((event as CustomEvent).detail.text));
  }, EMAIL_SUBMIT_EVENT);
}

const emailSubmissions = (page: Page) => page.evaluate(() => (window as any).__emailSubmissions as string[]);

async function blockExternalNavigation(page: Page) {
  await page.evaluate(() => {
    document.addEventListener('click', (event) => {
      if ((event.target as Element).closest('a[target="_blank"]')) event.preventDefault();
    });
  });
}

test.describe('Contact enquiry form', () => {
  test('email-only enquiry uses the fallback message', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);

    await page.getByLabel('E-mail').fill('anna@example.com');
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();

    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK]);
    await expect(page.locator('[data-form-status]')).toContainText('nie jest jeszcze dostępna');
  });

  test('whitespace-only message falls back and entered messages are preserved', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);
    const message = page.locator('#contact-message');
    const submit = page.getByRole('button', { name: 'Wyślij e-mailem' });

    await page.getByLabel('E-mail').fill('anna@example.com');
    await message.fill('   ');
    await submit.click();
    await message.fill('Szukam tortu na chrzciny.');
    await submit.click();

    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK, 'Szukam tortu na chrzciny.']);
  });

  test('structured details are appended to the fallback message', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);

    await page.getByLabel('E-mail').fill('anna@example.com');
    await page.locator('#contact-date').fill('2030-05-20');
    await page.locator('#contact-people').fill('25');
    await page.getByLabel(CREAM_FLAVORS[0]).check();
    await page.getByLabel(CREAM_FLAVORS[1]).check();
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();

    expect(await emailSubmissions(page)).toEqual([
      `${MESSAGE_FALLBACK}\n\nTermin: 20.05.2030\nLiczba osób: 25\nSmaki kremów: ${CREAM_FLAVORS[0]}, ${CREAM_FLAVORS[1]}`,
    ]);
  });

  test('email action requires a valid email address only', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);
    const email = page.getByLabel('E-mail');
    const submit = page.getByRole('button', { name: 'Wyślij e-mailem' });

    await submit.click();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toBeFocused();
    await expect(page.locator('#contact-email-error')).toContainText('Podaj adres e-mail');

    await email.fill('anna@');
    await submit.click();
    await expect(page.locator('#contact-email-error')).toContainText('Sprawdź adres e-mail');

    await email.fill('anna@example.com');
    await expect(email).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#contact-message')).not.toHaveAttribute('aria-invalid', 'true');
    expect(await emailSubmissions(page)).toEqual([]);
  });

  test('communicators work with a blank form or an invalid email', async ({ page }) => {
    await openContactPage(page);
    await blockExternalNavigation(page);
    const whatsapp = page.locator('a[data-channel="whatsapp"]');

    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');

    await whatsapp.click();
    await expect(whatsapp).toHaveAttribute('href', `https://wa.me/48500268600?text=${encodeURIComponent(MESSAGE_FALLBACK)}`);
    await expect(page.locator('[data-form-status]')).toHaveText('');
  });

  test('communicator draft includes details but omits the email address', async ({ page }) => {
    await openContactPage(page);

    await page.getByLabel('E-mail').fill('anna@example.com');
    await page.locator('#contact-message').fill('Tort na urodziny');
    await page.locator('#contact-people').fill('12');

    const href = await page.locator('a[data-channel="whatsapp"]').getAttribute('href');
    const text = new URL(href!).searchParams.get('text');
    expect(text).toBe('Tort na urodziny\n\nLiczba osób: 12');
    expect(href).not.toContain('example.com');
  });

  test('Instagram offers copying when the customer entered content', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__copied = [];
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (text: string) => (window as any).__copied.push(text) },
      });
    });
    await openContactPage(page);
    await blockExternalNavigation(page);
    const handoff = page.locator('[data-handoff]');

    await page.locator('a[data-channel="instagram"]').click();
    await expect(handoff).toBeHidden();

    await page.locator('#contact-message').fill('Tort z motywem lasu');
    await page.locator('a[data-channel="instagram"]').click();
    await expect(handoff).toBeVisible();
    await expect(handoff.locator('[data-handoff-open]')).toHaveAttribute('href', 'https://ig.me/m/nulo.cake');

    await page.getByRole('button', { name: 'Kopiuj treść' }).click();
    await expect(page.locator('[data-handoff-status]')).toHaveText('Skopiowano treść.');
    expect(await page.evaluate(() => (window as any).__copied)).toEqual(['Tort z motywem lasu']);
  });

  test('unconfigured communicators are disabled', async ({ page }) => {
    await openContactPage(page);

    await expect(page.getByRole('button', { name: /Messenger/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Telegram/ })).toBeDisabled();
  });

  test('flavour selection is limited by MAX_CREAM_FLAVORS', async ({ page }) => {
    await openContactPage(page);
    const count = page.locator('[data-flavors-count]');

    for (const flavor of CREAM_FLAVORS.slice(0, MAX_CREAM_FLAVORS)) {
      await page.getByLabel(flavor).check();
    }
    await expect(count).toHaveText(`Wybrano ${MAX_CREAM_FLAVORS} z ${MAX_CREAM_FLAVORS}`);
    await expect(page.getByLabel(CREAM_FLAVORS[MAX_CREAM_FLAVORS])).toBeDisabled();

    await page.getByLabel(CREAM_FLAVORS[0]).uncheck();
    await expect(page.getByLabel(CREAM_FLAVORS[MAX_CREAM_FLAVORS])).toBeEnabled();
    await expect(count).toHaveText(`Wybrano ${MAX_CREAM_FLAVORS - 1} z ${MAX_CREAM_FLAVORS}`);
  });

  test('inspiration images can be selected and removed', async ({ page }) => {
    await openContactPage(page);
    const list = page.locator('[data-image-list]');
    const note = page.locator('[data-images-note]');

    await page.locator('[data-image-input]').setInputFiles('src/assets/gallery/1-1.jpeg');
    await expect(list).toContainText('1-1.jpeg');
    await expect(note).toBeVisible();

    await page.getByRole('button', { name: 'Usuń 1-1.jpeg' }).click();
    await expect(list.locator('li')).toHaveCount(0);
    await expect(note).toBeHidden();
  });

  test('form initialises once after navigating away and back', async ({ page }) => {
    await openContactPage(page);

    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);
    await page.click(navLinkSelector('kontakt'));
    await page.waitForURL('**/kontakt');
    await waitForHydration(page);

    await captureEmailSubmissions(page);
    await page.getByLabel('E-mail').fill('anna@example.com');
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();

    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK]);
  });
});
