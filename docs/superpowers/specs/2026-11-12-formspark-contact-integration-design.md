# Contact Form: Formspark and Cloudinary

**Date:** 2026-11-12
**Status:** Implemented; separate Polish-labelled email fields approved in conversation
**Related:** `DESIGN.md`, `src/components/contact/ContactForm.astro`,
`src/config/contact.ts`, `src/utils/contactEnquiry.ts`,
`2026-11-09-contact-enquiry-form-design.md`

## 1. Purpose and Decision

Connect the existing Kontakt email enquiry action to Formspark. Upload optional
inspiration images to Cloudinary and submit their public URLs, not file bodies,
to Formspark.

Use browser `fetch` without a new backend, framework, or SDK. Compared with a
plain HTML POST, AJAX preserves the existing validation and keeps visitors on
Kontakt with inline feedback. Signed Cloudinary uploads would provide tighter
control but require a backend; use an unsigned preset for this integration.

This specification supersedes the previous contact-form specification's
deferral of actual submission and image transport. Existing field semantics,
communicator behaviour, and page layout remain unchanged.

## 2. Provider Configuration

Use the following public settings, supplied by the user:

- Formspark endpoint: `https://submit-form.com/Lu7wXKqqg`
- Cloudinary cloud name: `gaywqckp`
- Cloudinary unsigned upload preset: `nulocake-contact-form`

Keep provider settings and image limits together in the existing contact
configuration. These values are browser-visible identifiers, not secrets.
Never request or include a Cloudinary API secret in the client.

The Cloudinary preset must allow unsigned image uploads. Restrict its allowed
formats to JPEG, PNG, and WebP and disallow client-specified public IDs.
Client-side size and count checks improve usability but are not an abuse
prevention boundary. The account owner must configure the preset and monitor
provider usage; this change does not modify account settings.

## 3. Submission Flow

1. Prevent default form navigation and reject overlapping submit attempts.
2. Apply the existing email-only validation and focus the invalid email field.
3. Capture the current enquiry and selected images.
4. Disable editable form controls while uploading and submitting, without
   disabling navigation or communicator links.
5. Upload each image through Cloudinary's unsigned image-upload endpoint using
   multipart `FormData` containing `file` and `upload_preset`.
6. Require a successful upload response with an HTTPS `secure_url`. Do not
   submit the enquiry if any selected image fails to upload.
7. POST JSON to Formspark with both `Content-Type` and `Accept` set to
   `application/json`.
8. Show success only after Formspark accepts the submission. This confirms
   acceptance, not delivery to the owner's email inbox.

The Formspark payload contains:

- `email`: the trimmed reply address.
- `Wiadomość`: the trimmed message, or the existing fallback when blank.
- `Termin`: a valid supplied date in `yyyy/mm/dd` format; omitted otherwise.
- `Liczba osób`: a positive integer formatted as a string; omitted otherwise.
- `Smaki`: an array of selected flavours; omitted when there are none.
- `Inspiracje`: an array of uploaded image URLs; omitted when there are none.
- `_language`: `pl`.
- `_email.subject`: a fixed Polish enquiry subject, represented as a nested
  `_email` object in the JSON payload.

Share the existing message fallback and date/people formatting rules between
structured email fields and communicator text. Keep communicator messages and
the cancellable email event's text unchanged. Do not duplicate date, people, or
flavours inside `Wiadomość`, or send the old `message` and `images` fields.

Use separate fields rather than relying on line breaks in a single message.
Flavours and inspiration URLs remain arrays so Formspark can render lists;
exact spacing and bullet styling are controlled by its notification renderer.
Do not add an email template or change provider account settings.

Do not send `File` objects, base64 image bodies, local object URLs, or filenames
as substitutes for uploaded images.

Keep upload/HTTP responsibilities separate from DOM state and feedback.
Preserve the existing cancellable email-submit event as an integration seam:
only an unhandled, valid event proceeds to the real submission.

## 4. Inspiration Images

- Allow at most 5 selected images.
- Allow JPEG, PNG, and WebP only.
- Limit each file to 10 MiB (`10 * 1024 * 1024` bytes).
- Show these restrictions next to the image control.
- Reject invalid additions with a clear Polish message while preserving the
  previously selected images.
- Retain duplicate detection, thumbnails, and individual removal.
- Selecting or removing an image does not upload or delete a remote asset.
- Upload only after the customer submits a valid email enquiry.

Cache each successful upload URL for the lifetime of that selected file on the
current page. A retry after a later upload or Formspark failure reuses those
URLs instead of uploading the same files again. Removing the file drops its
cached URL; navigation or a successful form reset clears the page-local cache.

Cloudinary URLs are publicly accessible to anyone with the link. Explain this
briefly near the image control before submission. There is no automatic remote
cleanup: images may remain in Cloudinary after a failed or abandoned enquiry.
Do not add destructive asset-management calls or expose management credentials.

## 5. Feedback, Failure, and Lifecycle

Preserve the Noir Patisserie design system, existing typography, responsive
composition, button label, and reduced-motion behaviour. No redesign or new
animation is required.

Use inline Polish feedback for uploading, sending, successful acceptance,
invalid image selection, and upload/submission failures. Expose busy state
accessibly and retain the existing live status region.

While busy, prevent duplicate requests and preserve the sending status.
On failure, restore controls and keep all form data, selected images, and
successful upload URLs so the customer can retry. Do not show success on an
HTTP error, malformed upload response, or network failure.

After confirmed acceptance, clear the form, previews, upload cache, validation
state, and any prepared communicator preview; restore overlays and flavour
selection controls to their initial state. Keep the success message visible.

Give requests a finite timeout. Abort pending requests when the Astro page is
replaced and clean up listeners and local object URLs. An aborted request does
not guarantee that the remote service cancelled an upload or submission;
never automatically retry a Formspark POST.

## 6. Verification and Boundaries

Add or update regression coverage for the JSON payload, fallback text, email
validation, image restrictions, upload ordering, retry reuse, duplicate-submit
protection, success reset, failures, and Astro navigation cleanup.

Mock Formspark and Cloudinary in all submission tests, including existing tests
that previously expected the unavailable-integration placeholder. No test may
fall through to a real provider upload or submission.

Read and follow `docs/testing.md` before test work. Do not run tests unless the
user asks. Local type checking, build checks, and diff inspection may be used
without making live submissions.

Do not upload real files, send email, or POST to the live Formspark endpoint
without explicit permission for that action. Dashboard configuration,
autoresponders, additional spam-protection products, backend signing, automatic
asset deletion, and email-delivery verification are outside this change.

## 7. References

- https://documentation.formspark.io/setup/
- https://documentation.formspark.io/examples/astro.html
- https://documentation.formspark.io/examples/ajax.html
- https://documentation.formspark.io/setup/file-uploads.html
- https://documentation.formspark.io/setup/arrays-and-objects.html
- https://documentation.formspark.io/html-form/form-validation.html
- https://documentation.formspark.io/customization/notification-email.html
- https://documentation.formspark.io/customization/language.html
- https://cloudinary.com/documentation/upload_images#unsigned_upload
- https://cloudinary.com/documentation/upload_presets
