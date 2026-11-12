import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/base-fixture';
import { testConfig, navLinkSelector } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { CONTACT_IMAGES, CONTACT_SUBMISSION, CREAM_FLAVORS, MAX_CREAM_FLAVORS, MESSAGE_FALLBACK } from '../../../src/config/contact';

const uploadUrl = `https://api.cloudinary.com/v1_1/${CONTACT_SUBMISSION.cloudinaryCloudName}/image/upload`;
const uploadedImageUrl = 'https://res.cloudinary.com/gaywqckp/image/upload/inspiration.png';
const corsHeaders = { 'access-control-allow-origin': '*' };
interface ImageFixture {
  name: string;
  type: string;
  size?: number;
}

const image = (name = 'inspiration.png') => ({
  name,
  type: 'image/png',
});

async function selectImages(page: Page, files: ImageFixture[]) {
  await page.locator('[data-image-input]').evaluate((input: HTMLInputElement, fixtures) => {
    const png = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),
      (char) => char.charCodeAt(0),
    );
    const transfer = new DataTransfer();
    fixtures.forEach(({ name, type, size }) => {
      transfer.items.add(new File([size ? new Uint8Array(size) : png], name, { type, lastModified: 1 }));
    });
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, files);
}

async function openContactPage(page: Page) {
  await page.goto(testConfig.routes.kontakt);
  await waitForHydration(page);
}

async function captureFormspark(page: Page, status = 200) {
  const payloads: Record<string, unknown>[] = [];
  await page.route(CONTACT_SUBMISSION.formsparkUrl, async (route) => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ status, headers: corsHeaders, contentType: 'application/json', body: '{}' });
  });
  return payloads;
}

async function captureUploads(page: Page) {
  const bodies: string[] = [];
  await page.route(uploadUrl, async (route) => {
    bodies.push(route.request().postDataBuffer()!.toString());
    await route.fulfill({ headers: corsHeaders, json: { secure_url: uploadedImageUrl } });
  });
  return bodies;
}

async function sendEnquiry(page: Page) {
  await page.getByLabel('E-mail').fill('anna@example.com');
  await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();
}

async function holdProviderFetch(page: Page, url: string) {
  await page.evaluate((target) => {
    const state = { started: 0, aborted: 0, hold: true };
    (window as any).__providerRequest = state;
    const original = window.fetch.bind(window);
    window.fetch = (input, options) => {
      if (String(input) !== target || !state.hold) return original(input, options);
      state.started++;
      return new Promise<Response>((_, reject) => {
        const abort = () => {
          state.aborted++;
          reject(new DOMException('Aborted', 'AbortError'));
        };
        if (options?.signal?.aborted) abort();
        else options?.signal?.addEventListener('abort', abort, { once: true });
      });
    };
  }, url);
}

test.describe('Contact provider submission', () => {
  test.beforeEach(async ({ page }) => {
    // Fail closed: every provider request must be explicitly mocked by the test.
    await page.route('https://submit-form.com/**', (route) => route.abort());
    await page.route('https://api.cloudinary.com/**', (route) => route.abort());
  });

  test('email-only enquiry sends JSON metadata and resets only after acceptance', async ({ page }) => {
    const payloads = await captureFormspark(page);
    await openContactPage(page);
    const requests: { contentType?: string; accept?: string }[] = [];
    page.on('request', (request) => {
      if (request.url() === CONTACT_SUBMISSION.formsparkUrl) {
        requests.push({ contentType: request.headers()['content-type'], accept: request.headers().accept });
      }
    });

    await sendEnquiry(page);
    await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'success');
    expect(payloads).toEqual([{
      email: 'anna@example.com',
      message: MESSAGE_FALLBACK,
      _language: 'pl',
      _email: { subject: 'Zapytanie o tort - Nulo Cake' },
    }]);
    expect(requests).toEqual([{ contentType: 'application/json', accept: 'application/json' }]);
    await expect(page.getByLabel('E-mail')).toHaveValue('');
    await expect(page.locator('[data-email-label]')).toHaveText('');
    await expect(page.locator('[data-contact-form]')).not.toHaveAttribute('aria-busy');
    await expect(page.getByRole('button', { name: 'Wyślij e-mailem' })).toBeEnabled();
  });

  test('blank and invalid emails do not upload or submit', async ({ page }) => {
    const payloads = await captureFormspark(page);
    const uploads = await captureUploads(page);
    await openContactPage(page);
    await selectImages(page, [image()]);
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();
    await expect(page.getByLabel('E-mail')).toBeFocused();
    await page.getByLabel('E-mail').fill('anna@');
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(payloads).toEqual([]);
    expect(uploads).toEqual([]);
  });

  test('images upload before the formatted enquiry and success clears all draft state', async ({ page }) => {
    const payloads = await captureFormspark(page);
    const uploads = await captureUploads(page);
    await openContactPage(page);
    await page.locator('#contact-message').fill('Tort z motywem lasu');
    await page.locator('#contact-date').fill('2030/05/20');
    await page.locator('#contact-people').fill('25');
    await page.locator('.flavor-summary').click();
    for (const flavor of CREAM_FLAVORS.slice(0, MAX_CREAM_FLAVORS)) {
      await page.getByLabel(flavor).check();
    }
    await selectImages(page, [image()]);
    expect(uploads).toHaveLength(0);
    await page.locator('a[data-channel="instagram"]').click();
    await expect(page.locator('[data-handoff]')).toBeVisible();

    const order: string[] = [];
    page.on('request', (request) => {
      if ([uploadUrl, CONTACT_SUBMISSION.formsparkUrl].includes(request.url())) order.push(request.url());
    });
    await sendEnquiry(page);
    await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'success');
    expect(order).toEqual([uploadUrl, CONTACT_SUBMISSION.formsparkUrl]);
    expect(uploads[0]).toContain('name="upload_preset"');
    expect(uploads[0]).toContain(CONTACT_SUBMISSION.cloudinaryUploadPreset);
    expect(uploads[0]).toContain('name="file"; filename="inspiration.png"');
    expect(payloads[0].images).toEqual([uploadedImageUrl]);
    expect(payloads[0].message).toBe(
      `Tort z motywem lasu\n\nTermin: 2030/05/20\nLiczba osób: 25\nSmaki kremów: ${CREAM_FLAVORS.slice(0, MAX_CREAM_FLAVORS).join(', ')}`,
    );
    await expect(page.locator('#contact-message')).toHaveValue('');
    await expect(page.locator('#contact-date')).toHaveValue('');
    await expect(page.locator('#contact-people')).toHaveValue('');
    await expect(page.locator('[data-image-list] li')).toHaveCount(0);
    await expect(page.locator('[data-images-note]')).toBeHidden();
    await expect(page.locator('[data-flavors-count]')).toHaveText(`(0 z ${MAX_CREAM_FLAVORS})`);
    await expect(page.locator('[data-handoff]')).toBeHidden();
    await expect(page.locator('[data-handoff-preview]')).toHaveValue('');
    await expect(page.locator('input[name="flavors"]:disabled')).toHaveCount(0);
  });

  test('busy state prevents duplicate submissions and preserves progress feedback', async ({ page }) => {
    await openContactPage(page);
    await holdProviderFetch(page, CONTACT_SUBMISSION.formsparkUrl);
    await sendEnquiry(page);
    await expect(page.locator('[data-contact-form]')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByLabel('E-mail')).toHaveValue('anna@example.com');
    await expect(page.getByLabel('E-mail')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Wyślij e-mailem' })).toBeDisabled();
    await expect(page.locator('a[data-channel="whatsapp"]')).toBeEnabled();
    await page.locator('[data-contact-form]').evaluate((form) => {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      form.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(await page.evaluate(() => (window as any).__providerRequest.started)).toBe(1);
    await expect(page.locator('[data-form-status]')).toHaveText('Wysyłanie wiadomości...');
  });

  test('image format and size errors preserve already selected images', async ({ page }) => {
    const uploads = await captureUploads(page);
    await openContactPage(page);
    await selectImages(page, [image()]);
    await selectImages(page, [{ name: 'drawing.svg', type: 'image/svg+xml' }]);
    await expect(page.locator('[data-image-error]')).toContainText('JPEG, PNG lub WebP');
    await expect(page.locator('[data-image-list] li')).toHaveCount(1);

    await selectImages(page, [{
      ...image('large.png'),
      size: CONTACT_IMAGES.maxFileBytes + 1,
    }]);
    await expect(page.locator('[data-image-error]')).toContainText('maksymalnie 10 MB');
    await expect(page.locator('[data-image-list] li')).toHaveCount(1);
    expect(uploads).toEqual([]);
    await page.getByRole('button', { name: 'Usuń inspiration.png' }).click();
    await expect(page.locator('[data-image-error]')).toHaveText('');
  });

  test('selection count and duplicate detection apply across file picker uses', async ({ page }) => {
    await openContactPage(page);
    const input = page.locator('[data-image-input]');
    await input.setInputFiles('src/assets/gallery/1-1.jpeg');
    await input.setInputFiles('src/assets/gallery/1-1.jpeg');
    await expect(page.locator('[data-image-list] li')).toHaveCount(1);
    await selectImages(page, Array.from({ length: CONTACT_IMAGES.maxCount - 1 }, (_, index) => image(`${index}.png`)));
    await expect(page.locator('[data-image-list] li')).toHaveCount(CONTACT_IMAGES.maxCount);
    await selectImages(page, [image('extra.png')]);
    await expect(page.locator('[data-image-error]')).toContainText(`maksymalnie ${CONTACT_IMAGES.maxCount}`);
    await expect(page.locator('[data-image-list] li')).toHaveCount(CONTACT_IMAGES.maxCount);
    await page.getByRole('button', { name: 'Usuń 1-1.jpeg' }).click();
    await selectImages(page, [image('extra.png')]);
    await expect(page.locator('[data-image-error]')).toHaveText('');
    await expect(page.locator('[data-image-list] li')).toHaveCount(CONTACT_IMAGES.maxCount);
  });

  for (const failure of [
    { name: 'HTTP error', status: 400, body: '{}' },
    { name: 'missing URL', status: 200, body: '{}' },
    { name: 'non-HTTPS URL', status: 200, body: '{"secure_url":"http://example.com/image.png"}' },
    { name: 'invalid JSON', status: 200, body: 'not JSON' },
  ]) {
    test(`Cloudinary ${failure.name} blocks Formspark without losing the draft`, async ({ page }) => {
      const payloads = await captureFormspark(page);
      await page.route(uploadUrl, (route) => route.fulfill({
        status: failure.status, headers: corsHeaders, contentType: 'application/json', body: failure.body,
      }));
      await openContactPage(page);
      await selectImages(page, [image()]);
      await sendEnquiry(page);
      await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'error');
      await expect(page.locator('[data-form-status]')).toContainText('przesłać zdjęć');
      await expect(page.getByLabel('E-mail')).toHaveValue('anna@example.com');
      await expect(page.getByLabel('E-mail')).toBeEnabled();
      await expect(page.locator('[data-image-list] li')).toHaveCount(1);
      expect(payloads).toEqual([]);
    });
  }

  for (const status of [402, 403, 500]) {
    test(`Formspark HTTP ${status} is not reported as success`, async ({ page }) => {
      const payloads = await captureFormspark(page, status);
      await openContactPage(page);
      await page.locator('#contact-message').fill('Proszę o poradę.');
      await sendEnquiry(page);
      await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'error');
      await expect(page.locator('#contact-message')).toHaveValue('Proszę o poradę.');
      await expect(page.getByLabel('E-mail')).toBeEnabled();
      expect(payloads).toHaveLength(1);
    });
  }

  test('Formspark retry reuses uploads and removed images are not sent', async ({ page }) => {
    const uploads = await captureUploads(page);
    const payloads = await captureFormspark(page, 500);
    await openContactPage(page);
    await selectImages(page, [image('keep.png'), image('remove.png')]);
    await sendEnquiry(page);
    await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'error');
    expect(uploads).toHaveLength(2);
    expect(payloads).toHaveLength(1);
    await page.getByRole('button', { name: 'Usuń remove.png' }).click();
    const retryPayloads = await captureFormspark(page);
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();
    await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'success');
    expect(uploads).toHaveLength(2);
    expect(retryPayloads[0].images).toEqual([uploadedImageUrl]);
  });

  test('retry after a partial upload failure preserves earlier successful uploads', async ({ page }) => {
    const payloads = await captureFormspark(page);
    let attempts = 0;
    await page.route(uploadUrl, async (route) => {
      attempts++;
      await route.fulfill({
        status: attempts === 2 ? 500 : 200, headers: corsHeaders,
        json: { secure_url: `${uploadedImageUrl}?attempt=${attempts}` },
      });
    });
    await openContactPage(page);
    await selectImages(page, [image('first.png'), image('second.png')]);
    await sendEnquiry(page);
    await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'error');
    expect(attempts).toBe(2);
    expect(payloads).toEqual([]);
    await page.getByRole('button', { name: 'Wyślij e-mailem' }).click();
    await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'success');
    expect(attempts).toBe(3);
    expect(payloads[0].images).toEqual([`${uploadedImageUrl}?attempt=1`, `${uploadedImageUrl}?attempt=3`]);
  });

  for (const stage of ['upload', 'submission'] as const) {
    test(`${stage} network failure restores the form`, async ({ page }) => {
      const payloads = await captureFormspark(page);
      const target = stage === 'upload' ? uploadUrl : CONTACT_SUBMISSION.formsparkUrl;
      await page.route(target, (route) => route.abort('failed'));
      await openContactPage(page);
      if (stage === 'upload') await selectImages(page, [image()]);
      await sendEnquiry(page);
      await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'error');
      await expect(page.getByLabel('E-mail')).toHaveValue('anna@example.com');
      await expect(page.getByRole('button', { name: 'Wyślij e-mailem' })).toBeEnabled();
      expect(payloads).toEqual([]);
    });

    test(`${stage} timeout aborts the request and preserves the draft`, async ({ page }) => {
      await openContactPage(page);
      await page.clock.install();
      await holdProviderFetch(page, stage === 'upload' ? uploadUrl : CONTACT_SUBMISSION.formsparkUrl);
      if (stage === 'upload') await selectImages(page, [image()]);
      await sendEnquiry(page);
      await expect(page.locator('[data-contact-form]')).toHaveAttribute('aria-busy', 'true');
      await page.clock.fastForward(CONTACT_SUBMISSION.requestTimeoutMs + 1);
      await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'error');
      expect(await page.evaluate(() => (window as any).__providerRequest.aborted)).toBe(1);
      await expect(page.getByLabel('E-mail')).toHaveValue('anna@example.com');
      await expect(page.getByLabel('E-mail')).toBeEnabled();
    });

    test(`navigation aborts ${stage} and the form submits once after returning`, async ({ page }) => {
      const payloads = await captureFormspark(page);
      await openContactPage(page);
      await holdProviderFetch(page, stage === 'upload' ? uploadUrl : CONTACT_SUBMISSION.formsparkUrl);
      if (stage === 'upload') await selectImages(page, [image()]);
      await sendEnquiry(page);
      await expect(page.locator('[data-contact-form]')).toHaveAttribute('aria-busy', 'true');
      await page.click(navLinkSelector('oferta'));
      await page.waitForURL('**/oferta');
      await waitForHydration(page);
      expect(await page.evaluate(() => (window as any).__providerRequest.aborted)).toBe(1);
      expect(payloads).toEqual([]);
      await page.evaluate(() => { (window as any).__providerRequest.hold = false; });
      await page.click(navLinkSelector('kontakt'));
      await page.waitForURL('**/kontakt');
      await waitForHydration(page);
      await expect(page.locator('[data-image-list] li')).toHaveCount(0);
      await sendEnquiry(page);
      await expect(page.locator('[data-form-status]')).toHaveAttribute('data-state', 'success');
      expect(payloads).toHaveLength(1);
    });
  }
});
