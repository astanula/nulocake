# Communicator-First Contact Page Implementation Plan

**Date:** 2026-11-10
**Status:** Implemented; interactive browser review and building-pin confirmation pending
**Specification:** `docs/superpowers/specs/2026-11-10-contact-page-hierarchy-design.md`

## Goal and Constraints

Implement the approved variant A: introduction, direct contact details, and a
small map on the left; communicators above the email form on the right.
On mobile, use introduction, communicators, contact details, email form, map.

- Follow `DESIGN.md`, existing typography and tokens, the 1400px maximum
  content width, and the 900px single-column breakpoint.
- Preserve form fields, draft formatting, validation, image selection, and
  channel-specific handoff. Do not rebuild the form from the mockup.
- Show configured channels only. Keep their existing recipients and URLs.
- Add no dependencies, backend, email provider, or animation system.
- Do not run automated tests without the user's explicit request.
- Do not send real messages, submit enquiries to external services, or
  silently copy data while checking the page.
- Keep local `.superpowers/` mockups out of implementation commits.

## Existing Context and Main Risk

`src/pages/kontakt.astro` currently renders the introduction next to
`ContactForm`. The form owns the communicator markup, image warning,
copy-and-open handoff, and their styles.

Inside `initContactForm()`, communicator and handoff elements are queried
relative to the form. Simply moving their HTML to the top of the page would
disconnect them from the current draft or cause required-element queries
to return null.

Keep the existing controller and draft ownership. Widen only the lookup
scope for the relocated controls to a shared contact-page root. Continue
to scope fields, field listeners, validation, and email submission to the
real form.

Astro component styles are scoped. Move communicator and handoff styles
with their markup; do not assume the old form styles will apply to a
sibling component.

The site deploys under `/nulocake`. Preserve current navigation and
base-path handling. Google Maps and direct contact links are external
URLs and must not acquire that deployment prefix.

## File Boundaries

| File | Change |
|------|--------|
| `src/config/contact.ts` | Shared business contact details, alongside unchanged channel configuration. |
| `src/components/contact/ContactChannels.astro` | New communicator group, image warning, copy-and-open handoff, and their scoped presentation. |
| `src/components/contact/ContactForm.astro` | Existing form and controller; page-root lookups for relocated controls; secondary email-submit styling. |
| `src/components/contact/ContactMap.astro` | New click-to-load map, persistent directions link, and small independent lifecycle. |
| `src/pages/kontakt.astro` | Shared page root, contact-detail markup, semantic section order, and responsive grid. |
| `tests/e2e/contact/contact-form.spec.ts` | Focused updates for the changed public contract; execution remains gated. |

Leave `src/utils/contactEnquiry.ts`, `channelIcons.ts`, shared global styles,
and the home-page animation system unchanged unless implementation reveals
a concrete requirement within this scope.

## Task 1: Centralise Business Contact Details

**File:** `src/config/contact.ts`

- [x] Add one exported contact-details object containing the displayed phone
  number, email address, and address from the approved specification.
- [x] Derive the `tel:` destination by normalising the shared phone value;
  do not scatter hardcoded contact literals through page components.
- [x] Build the `mailto:` destination from the shared email address.
- [x] Derive the map query and directions destination from the same address,
  adding the country and URL encoding it as needed.
- [x] Preserve the existing channel configuration and handoff capabilities.
  Do not remove Telegram's supported type or invent a recipient for it.

**Checkpoint:** Displayed details are exactly `+48 500 268 600`,
`kontakt@nulocake.pl`, and `32-445 Krzyszkowice 756`. Telephone and email
destinations resolve to `tel:+48500268600` and
`mailto:kontakt@nulocake.pl`.

## Task 2: Relocate Communicators Without Losing the Shared Draft

**Files:** `ContactChannels.astro`, `ContactForm.astro`,
`src/pages/kontakt.astro`

- [x] Introduce `data-contact-page` on the contact page's main element.
- [x] Extract the communicator group into `ContactChannels.astro`; reuse
  `CONTACT_CHANNELS`, `CHANNEL_ICON_PATHS`, `channelUrl()`, and existing
  `data-channel`, `data-label`, and `data-prefill` attributes.
- [x] Render only channels with a recipient. Initially show Messenger,
  WhatsApp, and Instagram, without a disabled Telegram button.
- [x] Move the image warning and complete handoff UI with the group,
  preserving their IDs, data attributes, selectable preview, and status.
- [x] In the existing controller, locate the shared page root through the
  form. Query channel links, image warning, and handoff controls from that
  root; keep input and email-status queries form-scoped.
- [x] Preserve `readDraft()`, `refreshHandoff()`, email-only validation,
  clipboard fallback, file cleanup, and the existing form-dispatched
  `EMAIL_SUBMIT_EVENT`. Do not introduce duplicate state or a second draft.
- [x] Preserve `astro:page-load`, AbortController cleanup, and
  `astro:before-swap` behaviour for all relocated listeners.
- [x] Move scoped channel, handoff, preview, warning, focus, and
  reduced-motion styles to the new component. Supply the preview's
  necessary textarea styling locally rather than making field styles global.
- [x] Keep only the email action and email status with the actual form.
  Restyle the email-submit button locally as a secondary outlined action.

**Checkpoint:** Communicators work with a blank or invalid email, receive
the latest entered details, and retain copy-and-open behaviour when
prefill is unsupported. Image warnings and cleanup still work.

## Task 3: Compose Variant A and Direct Contact Details

**File:** `src/pages/kontakt.astro`

- [x] Retain the current introduction.
- [x] Use page-owned section wrappers in this DOM order: introduction,
  communicators, direct contact details, email form, map.
- [x] Use grid areas to place introduction, details, and map in the left
  column, with communicators and email form in the right column.
  Keep approximately the existing 0.8fr/1.2fr column proportions.
- [x] Style grid wrappers in the page, avoiding dependence on selectors
  reaching into child components across Astro style boundaries.
- [x] Render direct details as accessible, selectable text, with actual
  `tel:` and `mailto:` links and visible focus styling.
- [x] Add the approved communicator heading and short no-form-required
  explanation; introduce the form with "Wolisz e-mail?".
- [x] At 900px and below, stack sections in DOM order. Keep the map below
  the form so it does not displace primary contact actions.
- [x] Allow named communicator buttons to wrap on narrow screens with
  at least 44px hit areas, rather than hiding labels or adding overflow.
- [x] Preserve the Layout's existing subpage scroll container. Do not add
  a competing viewport-height or scroll-lock system.

**Checkpoint:** The desktop layout matches variant A, mobile focus order
matches the visual order, all business details are readable, and no
horizontal scrolling appears.

## Task 4: Add a Small Click-to-Load Google Map

**File:** `src/components/contact/ContactMap.astro`

- [x] Render a branded, fixed-height placeholder with the shared address
  and a button that explicitly loads Google Maps.
- [x] Explain that loading the map connects to Google. Include no map
  iframe request, map SDK, map preconnect, or automatic loading before
  the activation.
- [x] On activation, create one titled Google Maps iframe using the
  encoded shared address. Replace the placeholder without changing the
  reserved 210-220px height.
- [x] Leave map controls and attribution unmodified; do not apply dark
  filters over Google's map.
- [x] Keep a visible, protected new-tab directions link outside the
  replaceable area. It remains usable before activation, without
  JavaScript, and when embedded maps are blocked.
- [x] Make initialisation work on direct visits and Astro revisits.
  Clean up listeners before swaps and avoid duplicate frames or handlers.
- [x] Use an address-based target without guessed coordinates.
- [ ] Manually confirm the building pin before release; use a verified
  place target for both links if the address-based target is inaccurate.

**Checkpoint:** No Maps request occurs before activation, a small real
map loads afterward, and the directions link remains available in every
state. Existing Google Fonts requests are unrelated to map activation.

## Task 5: Focused Verification and Handoff

**Files:** `tests/e2e/contact/contact-form.spec.ts`, changed implementation
files

- [x] Before writing or updating E2E coverage, read `docs/testing.md` and
  invoke `playwright-e2e-testing`. Use the repository's fixtures,
  base-path handling, and navigation helpers.
- [x] Replace the stale assertion that Messenger is disabled. Assert a
  configured Messenger link and absence of unconfigured Telegram instead.
- [x] Retain existing checks for invalid-email bypass, prepared draft
  content, explicit copying, selected images, and navigation away/back.
  Their page-scoped locators should continue to work after extraction.
- [x] Add focused map activation coverage: no iframe/request before
  activation, one iframe after activation, and a persistent directions
  link. Intercept map requests so coverage does not depend on Google
  availability or trigger external resources.
- [x] Keep external conversations, clipboard side effects, and all real
  submission routes stubbed. Do not add brittle screenshot tests or
  duplicate the full existing form suite.
- [x] After implementation, run local Astro/TypeScript checking and the
  production build using the installed toolchain:
  `npm run astro -- check` and `npm run build`.
  Do not install or fetch dependencies merely to run checks.
- [ ] Inspect desktop, narrow mobile, and both sides of the 900px
  breakpoint. Check keyboard focus, long labels, page scrolling, copy
  fallback visibility, map size, and Astro return navigation.
- [ ] Confirm the real building pin manually, without sending an enquiry
  or starting a real business conversation.
- [x] Report changed files, completed checks, map-pin verification status,
  and the fact that live email delivery remains outside this change.

Do not execute the E2E suite unless explicitly requested by the user. If
requested, start with the focused contact file:

```bash
npx playwright test tests/e2e/contact/contact-form.spec.ts --config=tests/e2e/playwright.config.ts
```

## Execution Order

Implement tasks 1-4 in order, keeping the controller and relocated markup
changes in task 2 coherent. Complete task 5 after the page is assembled.
Do not start unrelated refactoring or broaden testing automatically.

## Implementation Results

- Application changes and focused E2E updates are implemented. The map uses
  a custom element's connection/disconnection lifecycle for Astro revisits.
- `npm run build` passes. The production Kontakt route responds with HTTP
  200 and renders the agreed section order and direct contact links.
- `npm run astro -- check` reports 66 errors in unchanged navigation,
  home-page, and Playwright-configuration files. It reports no diagnostics
  in the changed contact files. These unrelated errors are not modified.
- `git diff --check` passes. Automated tests have not been executed.
- Interactive desktop/mobile, keyboard, and navigation review remains
  pending, as does confirmation that Google's pin identifies the actual
  building. Address-based lookup is implemented, not a verified place pin.
