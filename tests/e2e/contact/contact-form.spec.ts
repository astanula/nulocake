import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/base-fixture';
import { testConfig, navLinkSelector } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { CAKE_FLAVORS } from '../../../src/config/cakeFlavors';
import { MESSAGE_FALLBACK } from '../../../src/config/contact';
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
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click();

    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK]);
    await expect(page.locator('[data-form-status]')).toHaveText('');
  });

  test('whitespace-only message falls back and entered messages are preserved', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);
    const message = page.locator('#contact-message');
    const submit = page.getByRole('button', { name: 'Wyślij wiadomość' });

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
    await page.getByRole('radio', { name: CAKE_FLAVORS[0].name }).click();
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click();

    expect(await emailSubmissions(page)).toEqual([
      `${MESSAGE_FALLBACK}\n\nTermin: 2030/05/20\nLiczba osób: 25\nSmak tortu: ${CAKE_FLAVORS[0].name}`,
    ]);
  });

  test('email action requires a valid email address only', async ({ page }) => {
    await openContactPage(page);
    await captureEmailSubmissions(page);
    const email = page.getByLabel('E-mail', { exact: true });
    const submit = page.getByRole('button', { name: 'Wyślij wiadomość' });

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

    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click();
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
    const channels = page.getByRole('group', { name: 'Porozmawiajmy na czacie', exact: true });

    await expect(channels.getByRole('link', { name: 'Messenger', exact: true })).toHaveAttribute(
      'href',
      'https://m.me/61583364552840',
    );
    await expect(channels.getByRole('link', { name: 'WhatsApp', exact: true })).toBeVisible();
    await expect(channels.getByRole('link', { name: 'Instagram', exact: true })).toBeVisible();
    await expect(page.locator('[data-channel="telegram"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Telegram/ })).toHaveCount(0);
  });

  test('direct contacts share a row above the map in the left column', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openContactPage(page);
    const details = page.getByRole('region', { name: 'Dane kontaktowe' });
    const phone = details.getByRole('link', { name: '+48 500 268 600' });
    const email = details.getByRole('link', { name: 'kontakt@nulocake.pl' });
    const map = page.getByRole('region', { name: 'Lokalizacja' });
    const form = page.getByRole('region', { name: 'Wyślij wiadomość przez formularz' });

    await expect(details.locator('dt')).toHaveCount(2);
    await expect(details).not.toContainText('32-445 Krzyszkowice 756');
    const phoneBox = await phone.boundingBox();
    const emailBox = await email.boundingBox();
    const detailsBox = await details.boundingBox();
    const mapBox = await map.boundingBox();
    const formBox = await form.boundingBox();
    expect(phoneBox).not.toBeNull();
    expect(emailBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(formBox).not.toBeNull();
    expect(Math.abs(phoneBox!.y - emailBox!.y)).toBeLessThan(1);
    expect(emailBox!.x).toBeGreaterThan(phoneBox!.x + phoneBox!.width);
    expect(mapBox!.y).toBeGreaterThanOrEqual(detailsBox!.y + detailsBox!.height);
    expect(mapBox!.x).toBeLessThan(formBox!.x);
  });

  test('direct contacts and map fit on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openContactPage(page);
    const details = page.getByRole('region', { name: 'Dane kontaktowe' });
    const map = page.getByRole('region', { name: 'Lokalizacja' });
    const detailsBox = await details.boundingBox();
    const mapBox = await map.boundingBox();

    expect(detailsBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(mapBox!.y).toBeGreaterThanOrEqual(detailsBox!.y + detailsBox!.height);
    expect(mapBox!.x + mapBox!.width).toBeLessThanOrEqual(375);
    await expect(details.getByRole('link', { name: '+48 500 268 600' })).toBeVisible();
    await expect(details.getByRole('link', { name: 'kontakt@nulocake.pl' })).toBeVisible();
  });

  test('map caption text sits close to the map without shrinking the directions target', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openContactPage(page);
    const map = page.locator('contact-location-map');
    const surfaceBox = await map.locator('.map-surface').boundingBox();
    const noteBox = await map.locator('#contact-map-note').boundingBox();
    const directions = map.getByRole('link', { name: 'Wyznacz trasę' });
    const directionsBox = await directions.boundingBox();
    const directionsTextBox = await directions.locator('span').boundingBox();

    expect(surfaceBox).not.toBeNull();
    expect(noteBox).not.toBeNull();
    expect(directionsBox).not.toBeNull();
    expect(directionsTextBox).not.toBeNull();
    const mapBottom = surfaceBox!.y + surfaceBox!.height;
    expect(noteBox!.y - mapBottom).toBeLessThanOrEqual(6);
    expect(directionsTextBox!.y - mapBottom).toBeLessThanOrEqual(6);
    expect(directionsBox!.height).toBeGreaterThanOrEqual(44);
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
    await expect(map.locator('.map-caption')).toHaveCSS('margin-top', '5px');
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
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click();
    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK]);

    await page.locator('[data-date-native]').evaluate((input: HTMLInputElement) => {
      input.value = '2030-06-01';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(date).toHaveValue('2030/06/01');
    await expect(date).not.toHaveAttribute('aria-invalid');
  });

  test('flavour dropdown overlays controls, selects a single offer flavour, closes, and clears', async ({ page }) => {
    await openContactPage(page);
    const [first, , third] = CAKE_FLAVORS;
    const dropdown = page.locator('.flavor-dropdown');
    const summary = dropdown.locator('summary');
    const optional = summary.locator('[data-flavor-optional]');
    const clearButton = page.getByRole('button', { name: 'Wyczyść wybrany smak' });
    const imageTrigger = page.getByRole('button', { name: 'Dodaj zdjęcie inspiracji' });
    const flavorGroup = page.getByRole('group', { name: 'Smak tortu' });

    await expect(flavorGroup).toBeVisible();
    await expect(flavorGroup.locator('legend')).toHaveCount(0);
    await expect(summary).toHaveText('Smak tortu — opcjonalnie', { useInnerText: true });
    await expect(optional).toBeVisible();
    await expect(clearButton).toBeHidden();

    const triggerBefore = await imageTrigger.boundingBox();
    expect(triggerBefore).not.toBeNull();

    await summary.click();
    await expect(dropdown).toHaveAttribute('open', '');
    await expect(dropdown.locator('.flavor-option')).toHaveCount(CAKE_FLAVORS.length);
    await expect(dropdown.locator('.flavor-option .cake')).toHaveCount(CAKE_FLAVORS.length);
    await expect(dropdown.locator('input[type="checkbox"]')).toHaveCount(0);

    const triggerWhileOpen = await imageTrigger.boundingBox();
    expect(triggerWhileOpen).not.toBeNull();
    expect(triggerWhileOpen!.y).toBe(triggerBefore!.y);

    await dropdown.getByRole('radio', { name: first.name }).click();
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(summary).toBeFocused();
    await expect(summary).toHaveText(`Smak tortu: ${first.name}`, { useInnerText: true });
    await expect(optional).toBeHidden();
    await expect(clearButton).toBeVisible();

    await summary.click();
    await expect(dropdown.getByRole('radio', { name: first.name })).toBeChecked();
    await expect(dropdown.locator('.flavor-option', { hasText: first.name }).locator('.flavor-option-mark')).toHaveCSS('visibility', 'visible');

    await dropdown.getByRole('radio', { name: third.name }).click();
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(summary).toHaveText(`Smak tortu: ${third.name}`, { useInnerText: true });

    await summary.click();
    await expect(dropdown.getByRole('radio', { name: first.name })).not.toBeChecked();
    await expect(dropdown.getByRole('radio', { name: third.name })).toBeChecked();
    await summary.click();

    await clearButton.click();
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(clearButton).toBeHidden();
    await expect(summary).toBeFocused();
    await expect(summary).toHaveText('Smak tortu — opcjonalnie', { useInnerText: true });
    await expect(optional).toBeVisible();
    await expect(dropdown.locator('input[name="flavor"]:checked')).toHaveCount(0);
  });

  test('flavour dropdown preserves selection on mobile and keeps it when re-selecting', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openContactPage(page);
    const dropdown = page.locator('.flavor-dropdown');
    const summary = dropdown.locator('summary');
    const flavor = dropdown.getByRole('radio', { name: CAKE_FLAVORS[0].name });

    await expect(flavor).toBeHidden();
    await summary.focus();
    await summary.press('Enter');
    await expect(flavor).toBeVisible();
    await flavor.click();

    await expect(dropdown).not.toHaveAttribute('open');
    await expect(flavor).toBeHidden();
    await expect(summary).toHaveText(`Smak tortu: ${CAKE_FLAVORS[0].name}`, { useInnerText: true });
    await expect(summary.locator('[data-flavor-optional]')).toBeHidden();

    await summary.press('Enter');
    await expect(flavor).toBeChecked();
    await flavor.click();
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(summary).toHaveText(`Smak tortu: ${CAKE_FLAVORS[0].name}`, { useInnerText: true });
  });

  test('flavour dropdown closes on Escape and outside click without losing selection', async ({ page }) => {
    await openContactPage(page);
    const dropdown = page.locator('.flavor-dropdown');
    const summary = dropdown.locator('summary');
    const flavor = dropdown.getByRole('radio', { name: CAKE_FLAVORS[0].name });

    await summary.click();
    await flavor.click();
    await expect(dropdown).not.toHaveAttribute('open');

    await summary.click();
    await expect(dropdown).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(summary).toBeFocused();
    await expect(summary).toContainText(CAKE_FLAVORS[0].name);

    await summary.click();
    await expect(dropdown).toHaveAttribute('open', '');
    await page.getByLabel('E-mail', { exact: true }).click();
    await expect(dropdown).not.toHaveAttribute('open');
    await expect(summary).toContainText(CAKE_FLAVORS[0].name);

    await summary.click();
    await expect(flavor).toBeChecked();
  });

  test('image and submit actions stay aligned on wide screens after choosing a photo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openContactPage(page);
    const image = page.getByRole('button', { name: 'Dodaj zdjęcie inspiracji' });
    const submit = page.getByRole('button', { name: 'Wyślij wiadomość' });

    await expect(submit).toHaveClass(/btn-primary/);
    await expect(submit).toHaveCSS('background-image', /linear-gradient/);
    await page.locator('[data-image-input]').setInputFiles('src/assets/gallery/1-1.jpeg');
    await expect(page.locator('[data-image-list]')).toContainText('1-1.jpeg');

    const imageBox = await image.boundingBox();
    const submitBox = await submit.boundingBox();
    expect(imageBox).not.toBeNull();
    expect(submitBox).not.toBeNull();
    expect(Math.abs((imageBox!.y + imageBox!.height / 2) - (submitBox!.y + submitBox!.height / 2))).toBeLessThan(1);
    expect(submitBox!.x).toBeGreaterThan(imageBox!.x + imageBox!.width);
  });

  test('image and submit actions fit on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openContactPage(page);
    const image = page.getByRole('button', { name: 'Dodaj zdjęcie inspiracji' });
    const submit = page.getByRole('button', { name: 'Wyślij wiadomość' });
    const imageBox = await image.boundingBox();
    const submitBox = await submit.boundingBox();

    expect(imageBox).not.toBeNull();
    expect(submitBox).not.toBeNull();
    expect(imageBox!.x).toBeGreaterThanOrEqual(0);
    expect(submitBox!.x + submitBox!.width).toBeLessThanOrEqual(375);
    expect(submitBox!.y).toBeGreaterThanOrEqual(imageBox!.y + imageBox!.height);
  });

  test('image information appears on hover and keyboard focus and closes with Escape', async ({ page }) => {
    await openContactPage(page);
    const trigger = page.getByRole('button', { name: 'Dodaj zdjęcie inspiracji' });
    const info = page.getByRole('button', { name: 'Informacje o zdjęciach' });
    const hint = page.locator('#contact-images-hint');

    await expect(hint).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-describedby', /contact-images-hint/);
    await expect(info).toHaveAttribute('aria-describedby', 'contact-images-hint');
    await info.hover();
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('JPEG, PNG lub WebP. Maksymalnie 5 zdjęć, do 10 MB każde.');
    await expect(hint).toContainText('Każdy, kto ma link, może je wyświetlić.');
    await hint.hover();
    await expect(hint).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(hint).toBeHidden();

    await page.mouse.move(0, 0);
    await trigger.focus();
    await page.keyboard.press('Tab');
    await expect(info).toBeFocused();
    await expect(hint).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(hint).toBeHidden();
  });

  test.describe('image information on touchscreens', () => {
    test.use({ hasTouch: true, viewport: { width: 375, height: 667 } });

    test('opens on tap and closes on a second tap or outside tap', async ({ page }) => {
      await openContactPage(page);
      const info = page.getByRole('button', { name: 'Informacje o zdjęciach' });
      const hint = page.locator('#contact-images-hint');

      await info.tap();
      await expect(hint).toBeVisible();
      await info.tap();
      await expect(hint).toBeHidden();
      await info.tap();
      await expect(hint).toBeVisible();
      await page.getByLabel('E-mail', { exact: true }).tap();
      await expect(hint).toBeHidden();
    });
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
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click();

    expect(await emailSubmissions(page)).toEqual([MESSAGE_FALLBACK]);
  });
});
