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
      .addEventListener(eventName, (event) => {
        event.preventDefault();
        submissions.push((event as CustomEvent).detail.text);
      });
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
  test.beforeEach(async ({ page }) => {
    await page.route('https://submit-form.com/**', (route) => route.abort());
    await page.route('https://api.cloudinary.com/**', (route) => route.abort());
  });

  test('email-only enquiry uses the fallback message', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);

    await page.getByLabel('E-mail', { exact: true }).fill('anna@example.com');
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();

    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK]);
    await expect(page.locator('[data-form-status]')).toHaveText('');
  });

  test('whitespace-only message falls back and entered messages are preserved', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);
    const message = page.locator('#contact-message');
    const submit = page.getByRole('button', { name: 'Wyślij e-mailem' });

    await page.getByLabel('E-mail', { exact: true }).fill('anna@example.com');
    await message.fill('   ');
    await submit.click();
    await message.fill('Szukam tortu na chrzciny.');
    await submit.click();

    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK, 'Szukam tortu na chrzciny.']);
  });

  test('structured details are appended to the fallback message', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);

    await page.getByLabel('E-mail', { exact: true }).fill('anna@example.com');
    await page.locator('#contact-date').fill('2030/05/20');
    await page.locator('#contact-people').fill('25');
    await page.locator('.flavor-summary').click();
    await page.getByLabel(CREAM_FLAVORS[0]).check();
    await page.getByLabel(CREAM_FLAVORS[1]).check();
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();

    expect(await emailSubmissions(page)).toEqual([
      `${MESSAGE_FALLBACK}\n\nTermin: 2030/05/20\nLiczba osób: 25\nSmaki kremów: ${CREAM_FLAVORS[0]}, ${CREAM_FLAVORS[1]}`,
    ]);
  });

  test('email action requires a valid email address only', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);
    const email = page.getByLabel('E-mail', { exact: true });
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
    await expect(page.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true');

    await whatsapp.click();
    await expect(whatsapp).toHaveAttribute('href', `https://wa.me/48500268600?text=${encodeURIComponent(MESSAGE_FALLBACK)}`);
    await expect(page.locator('[data-form-status]')).toHaveText('');
  });

  test('communicator draft includes details but omits the email address', async ({ page }) => {
    await openContactPage(page);

    await page.getByLabel('E-mail', { exact: true }).fill('anna@example.com');
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
    await expect(handoff.locator('[data-handoff-preview]')).toHaveValue('Tort z motywem lasu');

    await page.locator('#contact-people').fill('12');
    await expect(handoff.locator('[data-handoff-preview]')).toHaveValue('Tort z motywem lasu\n\nLiczba osób: 12');

    await page.getByRole('button', { name: 'Kopiuj treść' }).click();
    await expect(page.locator('[data-handoff-status]')).toHaveText('Skopiowano treść.');
    expect(await page.evaluate(() => (window as any).__copied)).toEqual(['Tort z motywem lasu\n\nLiczba osób: 12']);
  });

  test('only configured communicators are shown', async ({ page }) => {
    await openContactPage(page);
    const channels = page.getByRole('group', { name: 'Zacznijmy od rozmowy', exact: true });

    await expect(channels.getByRole('link', { name: 'Messenger', exact: true })).toHaveAttribute(
      'href',
      'https://m.me/61583364552840',
    );
    await expect(channels.getByRole('link', { name: 'WhatsApp', exact: true })).toBeVisible();
    await expect(channels.getByRole('link', { name: 'Instagram', exact: true })).toBeVisible();
    await expect(page.locator('[data-channel="telegram"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Telegram/ })).toHaveCount(0);
  });

  test('map loads only after activation and works after return navigation', async ({ page }) => {
    const mapRequests: string[] = [];
    await page.route('https://maps.google.com/maps?**', async (route) => {
      mapRequests.push(route.request().url());
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Map preview</title>' });
    });
    await openContactPage(page);

    const map = page.locator('contact-location-map');
    const directions = map.getByRole('link', { name: 'Wyznacz trasę' });
    const load = map.getByRole('button', { name: 'Wczytaj mapę Google' });
    await expect(load).toBeVisible();
    await expect(map.locator('iframe')).toHaveCount(0);
    await expect(directions).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?/);
    expect(mapRequests).toEqual([]);

    await load.click();
    await expect(map.locator('iframe')).toHaveCount(1);
    await expect(map.locator('iframe')).toHaveAttribute('title', 'Google Maps: 32-445 Krzyszkowice 756');
    await expect.poll(() => mapRequests.length).toBe(1);
    await expect(load).toHaveCount(0);
    await expect(directions).toBeVisible();

    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);
    await page.click(navLinkSelector('kontakt'));
    await page.waitForURL('**/kontakt');
    await waitForHydration(page);

    await expect(load).toBeVisible();
    await expect(map.locator('iframe')).toHaveCount(0);
    expect(mapRequests).toHaveLength(1);
    await load.click();
    await expect.poll(() => mapRequests.length).toBe(2);
    await expect(map.locator('iframe')).toHaveCount(1);
    await expect(directions).toBeVisible();
  });

  test('date and people fields show an inline label until focused or filled', async ({ page }) => {
    await openContactPage(page);
    const dateField = page.locator('.overlay-field:has(#contact-date)');
    const peopleField = page.locator('.overlay-field:has(#contact-people)');
    const people = page.locator('#contact-people');
    const date = page.locator('#contact-date');

    await expect(page.getByRole('textbox', { name: 'Termin, opcjonalnie' })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Liczba osób, opcjonalnie' })).toBeVisible();
    await expect(dateField.locator('.field-overlay-empty')).toHaveText('Termin — opcjonalnie');
    await expect(peopleField.locator('.field-overlay-empty')).toHaveText('Liczba osób — opcjonalnie');

    await people.focus();
    await expect(peopleField.locator('.field-overlay-empty')).toBeHidden();
    await people.blur();
    await expect(peopleField.locator('.field-overlay-empty')).toBeVisible();

    const labels: Record<string, string> = { '1': 'Liczba osób: 1', '6': 'Liczba osób: 6', '25': 'Liczba osób: 25' };
    for (const [value, label] of Object.entries(labels)) {
      await people.fill(value);
      await people.blur();
      await expect(peopleField.locator('.field-overlay-empty')).toBeHidden();
      await expect(peopleField.locator('.field-overlay-filled')).toHaveText(label);
    }

    await people.fill('');
    await people.blur();
    await expect(peopleField.locator('.field-overlay-filled')).toBeHidden();
    await expect(peopleField.locator('.field-overlay-empty')).toBeVisible();

    await date.fill('2030/05/20');
    await date.blur();
    await expect(dateField.locator('.field-overlay-empty')).toBeHidden();
    await expect(dateField.locator('.field-overlay-filled')).toHaveText('Termin: 20 maja 2030');
    await date.fill('2030/06/01');
    await date.blur();
    await expect(dateField.locator('.field-overlay-filled')).toHaveText('Termin: 1 czerwca 2030');
    await date.fill('');
    await date.blur();
    await expect(dateField.locator('.field-overlay-empty')).toBeVisible();
  });

  test('date field uses the yyyy/mm/dd format', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);
    const date = page.locator('#contact-date');

    await date.pressSequentially('20300520');
    await expect(date).toHaveValue('2030/05/20');
    await date.fill('2030-0520xyz');
    await expect(date).toHaveValue('2030/05/20');
    await date.fill('2030/05');
    await expect(date).toHaveValue('2030/05');
    await date.blur();
    await expect(date).toHaveAttribute('aria-invalid', 'true');

    await date.fill('2030/02/31');
    await date.blur();
    await expect(date).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('E-mail', { exact: true }).fill('anna@example.com');
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();
    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK]);

    await page.locator('[data-date-native]').evaluate((input: HTMLInputElement) => {
      input.value = '2030-06-01';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(date).toHaveValue('2030/06/01');
    await expect(date).not.toHaveAttribute('aria-invalid');
  });

  test('flavour selection is limited by MAX_CREAM_FLAVORS', async ({ page }) => {
    await openContactPage(page);
    const count = page.locator('[data-flavors-count]');
    const dropdown = page.locator('.flavor-dropdown');
    const summary = dropdown.locator('summary');
    const optional = summary.locator('[data-flavors-optional]');
    const flavorGroup = page.getByRole('group', { name: 'Smaki kremów' });

    await expect(flavorGroup).toBeVisible();
    await expect(flavorGroup.locator('legend')).toHaveCount(0);
    await expect(summary).toHaveText(`Wybierz smaki (0 z ${MAX_CREAM_FLAVORS}) — opcjonalnie`);
    await expect(optional).toBeVisible();
    await summary.click();
    for (const flavor of CREAM_FLAVORS.slice(0, MAX_CREAM_FLAVORS)) {
      await page.getByLabel(flavor).check();
    }
    await expect(count).toHaveText(`(${MAX_CREAM_FLAVORS} z ${MAX_CREAM_FLAVORS})`);
    await expect(summary).toHaveText(`${CREAM_FLAVORS.slice(0, MAX_CREAM_FLAVORS).join(', ')} (${MAX_CREAM_FLAVORS} z ${MAX_CREAM_FLAVORS})`, { useInnerText: true });
    await expect(optional).toBeHidden();
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(summary).toBeFocused();

    await summary.click();
    for (const flavor of CREAM_FLAVORS.slice(0, MAX_CREAM_FLAVORS)) {
      await expect(page.getByLabel(flavor)).toBeChecked();
    }
    await expect(page.getByLabel(CREAM_FLAVORS[MAX_CREAM_FLAVORS])).toBeDisabled();

    await page.getByLabel(CREAM_FLAVORS[0]).uncheck();
    await expect(page.getByLabel(CREAM_FLAVORS[MAX_CREAM_FLAVORS])).toBeEnabled();
    await expect(count).toHaveText(`(${MAX_CREAM_FLAVORS - 1} z ${MAX_CREAM_FLAVORS})`);
    await expect(dropdown).toHaveAttribute('open', '');

    for (const flavor of CREAM_FLAVORS.slice(1, MAX_CREAM_FLAVORS)) {
      await page.getByLabel(flavor).uncheck();
    }
    await expect(summary).toHaveText(`Wybierz smaki (0 z ${MAX_CREAM_FLAVORS}) — opcjonalnie`);
    await expect(optional).toBeVisible();
  });

  test('flavour dropdown preserves selection when closed on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openContactPage(page);
    const dropdown = page.locator('.flavor-dropdown');
    const summary = dropdown.locator('summary');
    const flavor = page.getByLabel(CREAM_FLAVORS[0]);

    await expect(flavor).toBeHidden();
    await summary.focus();
    await summary.press('Enter');
    await expect(flavor).toBeVisible();
    await flavor.check();
    await summary.press('Enter');

    await expect(flavor).toBeHidden();
    await expect(summary).toHaveText(`${CREAM_FLAVORS[0]} (1 z ${MAX_CREAM_FLAVORS})`, { useInnerText: true });
    await expect(summary.locator('[data-flavors-optional]')).toBeHidden();

    await summary.press('Enter');
    await expect(flavor).toBeChecked();
  });

  test('flavour dropdown closes on outside click without losing selection', async ({ page }) => {
    await openContactPage(page);
    const dropdown = page.locator('.flavor-dropdown');
    const summary = dropdown.locator('summary');
    const flavor = page.getByLabel(CREAM_FLAVORS[0]);

    await summary.click();
    await flavor.check();
    await expect(dropdown).toHaveAttribute('open', '');

    await page.getByLabel('E-mail', { exact: true }).click();
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(summary).toContainText(CREAM_FLAVORS[0]);

    await summary.click();
    await expect(flavor).toBeChecked();
  });

  test('inspiration images can be selected and removed', async ({ page }) => {
    await openContactPage(page);
    const trigger = page.getByRole('button', { name: 'Dodaj zdjęcie inspiracji' });
    const list = page.locator('[data-image-list]');
    const note = page.locator('[data-images-note]');

    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveCSS('color', 'rgb(229, 226, 225)');
    await expect(page.getByText('Inspiracje — opcjonalnie', { exact: true })).toHaveCount(0);

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
    await page.getByLabel('E-mail', { exact: true }).fill('anna@example.com');
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();

    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK]);
  });
});
