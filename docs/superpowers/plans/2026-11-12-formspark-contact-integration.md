# Formspark Contact Integration

**Specification:** `docs/superpowers/specs/2026-11-12-formspark-contact-integration-design.md`
**Status:** Implemented; email-formatting follow-up awaits test execution

## 1. Provider Configuration and Transport

Update `src/config/contact.ts` with the public Formspark and Cloudinary settings,
accepted MIME types, maximum image count, maximum file size, and request timeout.

Add `src/utils/contactSubmission.ts` to:

- Validate selected images without DOM dependencies.
- Upload an image with unsigned Cloudinary multipart parameters.
- Validate the upload response and its HTTPS URL.
- Submit separate Polish-labelled enquiry fields and uploaded URL arrays as
  Formspark JSON, sharing validation rules with the unchanged communicator text.
- Apply finite request timeouts and propagate the page's abort signal.
- Report upload and submission failures separately without trusting provider
  error text as UI content.

Use built-in browser APIs only. Do not call either provider during implementation
or verification.

## 2. Form State and Feedback

Update `src/components/contact/ContactForm.astro` to:

- Display accepted image formats, count/size limits, and public-link disclosure.
- Reject invalid image additions without discarding existing selections.
- Preserve the cancellable `contact:email-submit` event.
- Upload selected images sequentially, caching each successful URL on its
  selected image entry before starting the next request.
- Lock editable controls and prevent overlapping submissions while busy.
- Keep communicator links and site navigation independent of submission.
- Show accessible Polish progress, success, and error feedback.
- Preserve the draft and cached URLs after failure.
- Reset fields, image previews, overlays, flavour state, and prepared handoff
  content only after Formspark accepts the enquiry.
- Abort in-flight requests and revoke object URLs on Astro page replacement.

Keep the existing page composition and design tokens.

## 3. Mocked Regression Coverage

Follow `docs/testing.md` and the existing Playwright base fixture. Add provider
route interception before any form can submit; never fall through to real
Cloudinary or Formspark endpoints.

Update existing event-based form tests for the new submission flow and add
coverage for:

- Fallback and structured payloads, Polish metadata, and email validation.
- Upload parameters, HTTPS upload responses, and upload-before-submit ordering.
- Invalid formats, file size, selection count, duplicate selection, and removal.
- Busy controls, duplicate-submit prevention, and success reset.
- Upload/Formspark HTTP errors, network failures, and retry URL reuse.
- Request timeout, navigation cancellation, and clean initialization on return.

Write tests but do not run them unless the user explicitly requests execution.

## 4. Local Verification and Handoff

Run local Astro type checking, the production build, and `git diff --check`.
These checks must not upload files or submit forms.

Report the checks actually performed and distinguish mocked test coverage from
executed checks. Remind the user to confirm the preset is unsigned, restrict
formats, and disallow custom public IDs in Cloudinary. Do not claim that live
uploads, notification delivery, or account configuration have been verified.

## Verification Results

- `npm run build`: passed.
- `git diff --check` and equivalent checks for new files: passed.
- `npm run astro -- check`: blocked by 66 existing errors in
  `src/components/Navigation.astro`, `src/pages/index.astro`, and
  `tests/e2e/playwright.config.ts`. No diagnostics remain in the integration's
  changed or added files.
- At the user's request, the Playwright contact suite was run: 37 passed in
  40.5 seconds. Initial failures were caused by missing Chromium browser
  binaries; subsequent ambiguous email/Instagram test locators were corrected.
  Browser installation required Node's Windows system CA support.
- No live uploads, form submissions, email sends, or account changes were made.

## Email Formatting Follow-up

- Replaced the combined `message` and `images` fields with `Wiadomość`,
  optional `Termin` and `Liczba osób`, and optional `Smaki` and `Inspiracje`
  arrays. Communicator text remains unchanged.
- Updated mocked payload and retry assertions; added coverage for invalid
  optional details and whitespace-only message fallback.
- Production build, strict TypeScript checking of both contact utility modules,
  and `git diff --check`: passed.
- Tests were not run for this follow-up. No live submissions were sent, and
  Formspark's notification layout remains unverified.
