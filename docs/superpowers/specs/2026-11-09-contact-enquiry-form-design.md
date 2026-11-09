# Contact Enquiry Form

**Date:** 2026-11-09
**Status:** Design agreed in conversation; written specification awaiting review
**Related:** `src/pages/kontakt.astro`, `src/pages/oferta.astro`, `DESIGN.md`

## 1. Purpose

Help customers start a conversation about anything Nulo Cake offers, even when
they do not know what they want. This is an enquiry form, not an order,
reservation, cake configurator, or checkout.

The priority is a low barrier to contact. An email address alone is sufficient
for the email route. Communicator routes require no completed fields.

This document records the agreed behaviour. Page implementation and live
integrations are not part of this documentation change. Forminit integration
and actual email delivery are explicitly outside the current session.

## 2. Fields and Order

| Order | Label | Behaviour |
|-------|-------|-----------|
| 1 | E-mail | Required and format-validated only for the email action. |
| 2 | Wiadomość — opcjonalnie | Multiline text with the placeholder "Chcę zapytać o tort.". |
| 3 | Termin — opcjonalnie | Optional desired event date. |
| 4 | Liczba osób — opcjonalnie | Optional numeric input for an approximate number of people. |
| 5 | Smaki kremów — opcjonalnie | Optional multiple selection from an available-flavours list. |
| 6 | Inspiracje — opcjonalnie | Optional selection of inspiration images. |

Do not add name, phone, budget, separate occasion, collection, delivery,
payment, or other order-stage fields. Customers can describe their occasion or
ask for advice in the message.

Optional status must be explicit. Do not mark email as globally required:
its requirement depends on the chosen action.

## 3. Message Placeholder and Fallback

Use the exact text "Chcę zapytać o tort." both as the placeholder and as the
fallback message.

- When the textarea is empty, show the placeholder in a muted, readable colour.
- Focusing the empty textarea does not remove the placeholder.
- Typing hides it; clearing the textarea restores it.
- Keep the field label visible independently of the placeholder.
- Do not prepopulate the textarea with an actual value that users must delete.

When preparing an enquiry, use the fallback if the message is empty or contains
only whitespace. Otherwise preserve the customer's message. Append any supplied
structured details, even when using the fallback.

The message is optional and must never cause a required-field validation error.
Use the same message-preparation rule for email and communicator drafts.

## 4. Cream Flavours

Provide a multiple-choice list, not a free-text-only field. Start with a small
hardcoded demonstration list; these examples are not a confirmed production
flavour catalogue.

- Keep the maximum selection count in one constant, `MAX_CREAM_FLAVORS`.
- Its initial value is 3; changing it to 2 must not require changing UI logic.
- Allow zero selections or any number up to the maximum; no minimum applies.
- Derive the displayed selection count and limit from the same constant.
- At the limit, prevent additional selections while allowing deselection.
- Use a keyboard-accessible control with visible selected states.

The exact control presentation can be chosen during UI design. A
multi-checkbox dropdown is one option, not a requirement to build a custom
dropdown.

## 5. Contact Actions

Below the form, separate the primary action from communicator navigation:

- Primary button: "Wyślij e-mailem".
- Separate group labelled "Napisz przez:".
- Communicator choices: Messenger, WhatsApp, Instagram, Telegram.

Use recognisable names alongside icons. Keep a clear gap between the email
button and the communicator group. On narrow screens the group can move below
the email button instead of being compressed into one row.

Do not add an instructional paragraph explaining which fields email requires.
Do not repeat "Wolisz komunikator?" next to "Napisz przez:".

### Email Action

Only attempting the email action triggers required-field validation:

- Reject an empty or whitespace-only email address and an invalid address format.
- Highlight the email field in red and show a short, associated error message.
- Move focus to the invalid field; do not communicate the error by colour alone.
- Do not require a message, date, number of people, flavours, or images.
- With a valid email, prepare the enquiry using the fallback rule.

Actual submission, provider responses, success states, delivery failures, and
email attachment transport belong to the separate email integration. Do not
display a successful-send state before a real integration confirms submission.

### Communicator Actions

Communicator buttons never trigger email validation or require completed
fields, including when the email field is already showing an error.

Open the supported native-app route or web alternative for the selected
communicator. Prepare text containing the effective message and any supplied
date, number of people, and flavours. Omit empty structured fields and the
email address.

Prefill text only where the selected channel supports it. Otherwise offer an
explicit way to copy the prepared text. Do not promise identical prefill
behaviour across all four services or silently overwrite the clipboard.

Opening a communicator is not evidence that an enquiry was sent.

## 6. Inspiration Images

Customers may select inspiration images, but selecting files does not itself
send or upload them.

Do not assume a messaging link can transfer selected files. If a channel cannot
attach them automatically, explain that the customer must add them in the chat.
Do not treat filenames as transferred images or imply that attachments were
sent merely because an app opened.

Email upload limits, accepted formats, and attachment delivery will be defined
and verified as part of the separate email integration.

## 7. Design and Implementation Boundaries

Follow the existing Noir Patisserie design system in `DESIGN.md`, including
Epilogue, Manrope, existing colour tokens, responsive layouts, and readable
muted text. No new animation behaviour is specified.

Keep draft collection, message preparation, email-only validation, and
channel-specific handoff separate in responsibility. Do not introduce a backend
or storage system as part of the form's field design.

## 8. Acceptance Criteria for Later Implementation

- Email is first; all remaining fields are explicitly optional.
- A valid email with no other input produces "Chcę zapytać o tort.".
- A whitespace-only message uses the same fallback; entered messages are preserved.
- Structured details are included when supplied, with or without a custom message.
- Only the email action requires and validates the email address.
- Every communicator remains usable with a blank form or invalid email.
- Communicator drafts omit the email address and empty structured fields.
- The flavour maximum and its display follow `MAX_CREAM_FLAVORS`.
- Removing a selected flavour remains possible at the selection limit.
- Unsupported text and image handoffs are explained without claiming a send.
- The form remains usable with a keyboard and at mobile widths.

No tests are run as part of this specification change. Future test work must
follow `docs/testing.md` and requires the user's request before running tests.
