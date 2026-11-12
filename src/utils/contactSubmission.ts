import { CONTACT_IMAGES, CONTACT_SUBMISSION } from '../config/contact';
import { formatEnquiryFields, type EnquiryDraft } from './contactEnquiry';

export class ContactSubmissionError extends Error {
  constructor(public readonly stage: 'upload' | 'submission') {
    super(`Contact ${stage} failed`);
    this.name = 'ContactSubmissionError';
  }
}

export function imageSelectionError(files: readonly File[]): string {
  if (files.length > CONTACT_IMAGES.maxCount) {
    return `Możesz dodać maksymalnie ${CONTACT_IMAGES.maxCount} zdjęć.`;
  }
  if (files.some((file) => !(CONTACT_IMAGES.mimeTypes as readonly string[]).includes(file.type))) {
    return 'Wybierz zdjęcia w formacie JPEG, PNG lub WebP.';
  }
  if (files.some((file) => file.size > CONTACT_IMAGES.maxFileBytes)) {
    return `Każde zdjęcie może mieć maksymalnie ${CONTACT_IMAGES.maxFileBytes / (1024 * 1024)} MB.`;
  }
  return '';
}

async function request(
  url: string,
  options: RequestInit,
  signal: AbortSignal,
  readJson = false,
): Promise<unknown> {
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, CONTACT_SUBMISSION.requestTimeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return readJson ? await response.json() : undefined;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

export async function uploadContactImage(file: File, signal: AbortSignal): Promise<string> {
  try {
    if (imageSelectionError([file])) throw new Error('Invalid image');
    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', CONTACT_SUBMISSION.cloudinaryUploadPreset);

    const result = await request(
      `https://api.cloudinary.com/v1_1/${CONTACT_SUBMISSION.cloudinaryCloudName}/image/upload`,
      { method: 'POST', body },
      signal,
      true,
    );
    if (!result || typeof result !== 'object' || !('secure_url' in result) || typeof result.secure_url !== 'string') {
      throw new Error('Missing upload URL');
    }
    const url = new URL(result.secure_url);
    if (url.protocol !== 'https:') throw new Error('Invalid upload URL');
    return url.href;
  } catch {
    throw new ContactSubmissionError('upload');
  }
}

export async function submitContactEnquiry(
  draft: EnquiryDraft,
  imageUrls: readonly string[],
  signal: AbortSignal,
): Promise<void> {
  try {
    await request(
      CONTACT_SUBMISSION.formsparkUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: draft.email.trim(),
          ...formatEnquiryFields(draft),
          ...(imageUrls.length ? { Inspiracje: imageUrls } : {}),
          _language: 'pl',
          _email: { subject: 'Zapytanie o tort - Nulo Cake' },
        }),
      },
      signal,
    );
  } catch {
    throw new ContactSubmissionError('submission');
  }
}
