# Contact Page: Communicator-First Layout

**Date:** 2026-11-10
**Status:** Approved by the user after written-specification review
**Related:** `DESIGN.md`, `src/pages/kontakt.astro`,
`src/components/contact/ContactForm.astro`, `src/config/contact.ts`,
`2026-11-09-contact-enquiry-form-design.md`

## 1. Purpose and Decision

Make starting a conversation through a communicator the first contact action,
ahead of the email form. Add readable direct contact details and a small
Google Maps view without changing the website's Noir Patisserie identity.

The user selected variant A after comparing two browser mockups. Retain the
existing asymmetric two-column composition rather than introducing a
full-width communicator section.

This specification supersedes the previous contact-form specification only
for contact-action placement, visual priority, and the visibility of
unconfigured communicator channels. Existing enquiry behaviour remains in
force.

## 2. Desktop Composition

Keep the current maximum content width of 1400px, page padding, and
approximately 40/60 column proportions.

Left column, from top to bottom:

1. Existing contact heading and introductory paragraph.
2. Direct contact details: telephone, email, and address.
3. Small map with an independent directions link.

Right column, from top to bottom:

1. Communicator section, visible before any email fields.
2. A subtle divider and generous spacing.
3. Existing email form, introduced by "Wolisz e-mail?".

Use "Napisz przez:" as the communicator group label and
"Zacznijmy od rozmowy." as its heading. Explain briefly that customers can
start a chat without filling in the form. Do not promise a response time.

Give communicator buttons recognisable icons and visible names, pink text
and borders, a restrained tinted background, and comfortable hit areas.
Use consistent emphasis across available communicators; do not invent a
preferred service.

Make the email-submit button an outlined secondary action rather than the
page's strongest filled button. Retain its existing label. Keep the form
visible, not collapsed behind an accordion or a separate navigation step.

## 3. Mobile Composition

At the existing single-column breakpoint of 900px, use this reading order:

1. Heading and introduction.
2. Communicator buttons.
3. Telephone, direct email link, and address.
4. Email form.
5. Small map and directions link.

The map must not push the primary contact actions down the page. Retain
readable labels, visible keyboard focus, and touch targets at least 44px
high. Allow the communicator row to wrap when needed rather than compressing
its labels or causing horizontal overflow.

Keep the DOM reading order and keyboard navigation coherent with this
sequence; do not rely on visual reordering that produces a confusing focus
order.

## 4. Direct Contact Details

Show the following as text, not icon-only actions:

| Label | Display | Action |
|-------|---------|--------|
| Telefon | +48 500 268 600 | `tel:+48500268600` |
| E-mail | kontakt@nulocake.pl | `mailto:kontakt@nulocake.pl` |
| Adres | 32-445 Krzyszkowice 756 | Readable, selectable address |

The direct email link opens the customer's email application. It does not
submit the website form and does not depend on a future email provider.

Present the location neutrally as an address. Do not add opening hours,
walk-in availability, collection instructions, or appointment promises
without information from the business owner.

## 5. Small Google Map

Reserve a stable map area approximately 210-220px high and as wide as its
column. On mobile it remains a small, full-width map below the form.

Initially show a branded placeholder with the address and a clearly labelled
button to load Google Maps. Explain that loading it connects to Google.
Do not request Google Maps resources before that explicit interaction.

After activation, replace the placeholder with an address-targeted Google
Maps iframe. Keep the same dimensions, provide an accessible iframe title,
and leave Google's map controls and attribution legible and unmodified.
No map SDK or new map library is needed.

Keep an independent directions link below the map in every state. It opens
Google Maps directions to the same address in a new tab with appropriate
link protection, including when the iframe is blocked or unavailable.

Before release, manually confirm that Google's pin resolves to the correct
building. Do not invent coordinates or claim that an unverified pin has
already been confirmed. If address lookup is inaccurate, use a verified
Google Maps place target for both the embed and directions link.

## 6. Preserve Existing Enquiry Behaviour

Moving the communicator group does not create a second, independent enquiry
flow:

- A blank form must still allow immediate communicator navigation.
- If the customer has entered details, preserve existing message preparation
  from the current draft, even though the communicator group is now above it.
- Communicator actions never submit the form or trigger email validation.
- Preserve supported text prefill and explicit copy-and-open handoff where
  prefill is unavailable. Keep the handoff next to its triggering group.
- Keep image-attachment limitations visible when applicable. Opening a
  communicator must never imply that text or images have been sent.
- Keep all form fields, their order, optional status, validation, flavour
  limits, and image selection behaviour unchanged.
- Do not introduce email delivery, backend integration, or false send-success
  states as part of this change.

Only show channels with a configured recipient in `CONTACT_CHANNELS`.
Currently these are Messenger, WhatsApp, and Instagram. Omit the unconfigured
Telegram option rather than presenting a disabled primary contact method.
A subsequently configured channel should use the same existing handoff rules.

## 7. Implementation Boundaries

Use the page for layout, the existing contact interaction for draft and
handoff behaviour, and a small isolated map interaction for loading the
iframe. Moving markup outside the existing form must not disconnect it from
the shared draft or event cleanup.

Keep business contact details in `src/config/contact.ts` alongside the
existing channel configuration. Derive display links and map targets from
that shared data rather than duplicating literal contact details across
components. Keep presentation changes local to the contact page; do not
restyle shared buttons globally.

Follow `DESIGN.md`: Epilogue headings, Manrope body text, existing dark
surface tokens, pink accents, restrained dividers, and generous whitespace.
Do not introduce new scroll animations, persistent effects, dependencies,
or changes to the home-page animation system.

The page and map interaction must continue to work after Astro client-side
navigation, without duplicate listeners or stale contact drafts.

## 8. Verification and Acceptance

- Communicators appear above every email-form field on desktop and mobile.
- Direct contact details match section 4 exactly and use the correct links.
- Desktop retains variant A's split layout; mobile follows section 3.
- Active communicators remain usable with blank or invalid email fields.
- Entered details still feed the existing communicator handoff.
- Email fields and validation retain their current behaviour.
- No Google Maps requests occur before map activation.
- The map retains its dimensions during loading and uses the same location
  as the directions link.
- The directions link remains available without loading the iframe.
- Verify the layout at narrow mobile widths, at the breakpoint, and on
  desktop, including keyboard focus and return navigation through Astro.
- Confirm the actual map pin before publishing.

This session changes documentation and local mockups only. No automated
tests are run. Future test work must follow `docs/testing.md` and requires
the user's explicit request before execution.
