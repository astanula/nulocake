# Contact Enquiry Form Implementation Plan

**Date:** 2026-11-09
**Status:** Implemented. Pending: Forminit email delivery; Messenger and Telegram recipients (rendered disabled until configured); E2E suite written but not yet run
**Specification:** `docs/superpowers/specs/2026-11-09-contact-enquiry-form-design.md`

## Goal and Constraints

Replace the Kontakt placeholder with a low-friction enquiry form. Email is the
first field and the only required field for the email action. Every
communicator remains usable with no completed fields.

- Follow `DESIGN.md` and the existing layout, fonts, colours, and button styles.
- Preserve the exact Polish labels and fallback text from the specification.
- Keep Forminit, actual email submission, uploads, and server-side storage out
  of this implementation.
- Do not add dependencies, an animation system, or unrelated site refactoring.
- Do not run tests unless the user explicitly requests it.
- Do not send real enquiries or contact the business while verifying the UI.

## Existing Context

- `src/pages/kontakt.astro` currently contains only a placeholder.
- `src/layouts/Layout.astro` supplies navigation, footer, ClientRouter, and the
  subpage scroll container. The form must work after client-side navigation.
- `src/styles/global.css` supplies the Noir Patisserie tokens and button classes.
- `astro.config.mjs` deploys a static site under `/nulocake`; no email backend
  exists in the current application.
- Footer social links point to generic service homepages, not confirmed business
  conversation targets. Do not reuse those as if they were working chat links.

## Proposed File Boundaries

| File | Responsibility |
|------|----------------|
| `src/pages/kontakt.astro` | Page heading, layout, and form composition. |
| `src/components/contact/ContactForm.astro` | Semantic fields, scoped styling, accessible feedback, and DOM event lifecycle. |
| `src/config/contact.ts` | Message fallback, demo flavours, flavour limit, and configured channel destinations. |
| `src/utils/contactEnquiry.ts` | DOM-independent draft preparation, message formatting, and supported channel URL preparation. |
| `tests/e2e/contact/contact-form.spec.ts` | Focused regression coverage, following the existing test infrastructure. |

Keep the implementation at these boundaries unless a concrete need emerges.
Do not add a generic form framework or a channel plugin architecture.

## Task 1: Configuration and Enquiry Preparation

- [ ] Add `MAX_CREAM_FLAVORS = 3` and a small hardcoded demo flavour list.
- [ ] Store the exact fallback message in one constant shared by the placeholder
  and prepared-message logic.
- [ ] Define a draft containing email, message, optional date and people count,
  selected flavours, and selected image files.
- [ ] Use a whitespace check to select the fallback without rewriting a
  non-empty customer message.
- [ ] Prepare readable text containing the effective message and supplied
  structured details, omitting empty details.
- [ ] Exclude email and image filenames from communicator text. Keep files
  separate from text; a filename is not an attachment.
- [ ] Keep formatting independent of network calls and page elements.

**Review checkpoint:** Email-only input produces the agreed fallback message;
additional details are preserved without requiring a custom message.

## Task 2: Page and Accessible Form

- [ ] Replace the placeholder and compose the form inside the existing Layout.
- [ ] Add fields in the approved order: email, message, date, people, flavours,
  inspiration images. Show optional status explicitly on every field after email.
- [ ] Keep visible labels; use the muted fallback as the textarea placeholder,
  not its actual value.
- [ ] Use a numeric people input and a date input without making either required.
- [ ] Prefer native checkboxes in a labelled group for the initial flavour UI.
  Avoid a bespoke dropdown unless the layout genuinely needs it.
- [ ] Show the selection count using `MAX_CREAM_FLAVORS`; at the limit prevent
  further selection while retaining the ability to deselect.
- [ ] Add optional multiple-image selection with a visible selected-file list
  and a way to remove a selection. Do not upload files on selection.
- [ ] Add the email button and a visually separate "Napisz przez:" group with
  named communicator controls.
- [ ] Provide associated error/status regions, visible keyboard focus, readable
  placeholder contrast, and a layout that stacks cleanly on mobile.
- [ ] Do not add the rejected explanatory paragraphs above the action buttons.

**Review checkpoint:** Customers can understand the fields and optional status
without needing an introductory instruction block.

## Task 3: Client Lifecycle and Email-Only Validation

- [ ] Initialise on `astro:page-load`, including revisits through ClientRouter.
- [ ] Clean up page-specific listeners before swap and avoid duplicate handlers.
  An AbortController is sufficient; no shared state manager is needed.
- [ ] Trigger required/format validation only from the email action, including
  a keyboard submission of that action.
- [ ] Trim the email address for validation and reject blank or malformed input.
- [ ] On failure, show a short associated error, set `aria-invalid`, highlight
  the field in red, and focus it.
- [ ] Do not validate message presence. Optional-field controls must not become
  accidental prerequisites for opening a communicator.
- [ ] Make communicator controls non-submitting controls so email validity
  cannot block them.
- [ ] Prepare a valid email draft through a narrow submission handoff that a
  later Forminit integration can consume, including selected files.
- [ ] Until that integration exists, prevent accidental form navigation and
  report that email delivery is not connected after a valid email attempt.
  Never claim the message was sent or discard the draft.

**Review checkpoint:** Only email is required for the email route; every
communicator still works after an email validation error.

## Task 4: Communicator Handoff

- [ ] Before wiring live destinations, obtain confirmed business identifiers
  for Messenger, WhatsApp, Instagram, and Telegram. Do not invent recipients.
- [ ] With permission for network access, verify each service's current
  recipient-targeted link and text-prefill capabilities against its official
  documentation. Do not assume that a generic share link opens the business chat.
- [ ] Configure supported destinations and encode prepared text correctly.
- [ ] Use a native-app/web-supported route appropriate to each verified service.
  Where prefill is unsupported, expose an explicit "copy text" action.
- [ ] Copy only on user request. Handle clipboard rejection with a selectable
  text fallback instead of silently losing the prepared message.
- [ ] When images are selected and automatic handoff is unsupported, explain
  that they must be added again in the conversation.
- [ ] Keep external navigation directly tied to the customer's action, and
  do not represent an opened app as a successful send.

**Integration prerequisite:** Confirmed recipients and verified channel
capabilities are required for live handoff. The rest of the form can be built
without them, but unconfigured destinations must not masquerade as working
business-contact links.

## Task 5: Verification and Handoff

- [ ] Before writing E2E coverage, read `docs/testing.md` and invoke the
  `playwright-e2e-testing` skill. Follow the repository fixtures and base-path
  handling rather than importing Playwright's base test directly.
- [ ] Add focused regression cases for email-only fallback, whitespace-only
  messages, preservation of entered messages, optional details, email errors,
  communicator bypass, flavour limits, and navigation away and back.
- [ ] Verify the flavour limit's logic and visible count can both change to 2
  through the single configuration constant.
- [ ] Cover file selection/removal and text/image handoff feedback without
  uploading files or opening real external conversations.
- [ ] Stub clipboard and external handoff in automated checks.
- [ ] When test execution is explicitly requested, run the contact-specific
  suite using the command pattern in `docs/testing.md`; do not run the full
  suite automatically.
- [ ] Check TypeScript/Astro and the production build locally without adding
  dependencies or fetching packages. Report any environment blocker.
- [ ] Review desktop and mobile layouts and keyboard behaviour. Do not exercise
  any real send action during that review.
- [ ] Report which destinations are configured, which capabilities were
  verified, which checks ran, and that email delivery is still a separate task.

## Explicitly Deferred

Forminit credentials and requests; provider success/error handling; email
attachment limits and transport; server-side validation and abuse protection;
production flavour-catalogue approval; and collection, delivery, payment, or
reservation workflows.

The page must not be described as ready for live email enquiries until the
separate delivery integration is implemented and verified.
