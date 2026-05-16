# Plan: Homepage Motion Query Listener Accumulation

## Priority: 4 (Medium — cleanup and consistency)

## Issue Summary

In `src/pages/index.astro`, the `prefers-reduced-motion` media query listener is added without a duplicate guard:

```javascript
motionQuery.addEventListener('change', ...);
```

After N visits to the homepage, N listeners fire when the user's motion preference changes. This is mostly harmless but wasteful and inconsistent with the rest of the site's event-listener hygiene.

## Why this priority

This is the last of the listener-accumulation issues on the homepage. It should be fixed after the more critical ones (Priority 2 and 3) so that the guard pattern is already established and applied consistently. It has no direct user-facing bug today, but it contributes to the overall accumulation problem and should be cleaned up for correctness.

## Files Involved

- `src/pages/index.astro`

## Context Needed

- Locate where `motionQuery` is defined and where the `change` listener is attached.
- Understand what the handler does (likely toggles animation state or ScrollTrigger behavior).
- Apply the same module-level guard pattern used in Priorities 1–3.

## Dependencies

- Priority 2 (listener guard pattern) is the main prerequisite.
- Priority 3 is not strictly required for this fix, but it makes sense to batch all homepage listener fixes together.

## Success Criteria

- Only one `motionQuery` `change` listener exists regardless of how many times the homepage is visited.
- Changing the system's reduced-motion preference still correctly updates the homepage animation behavior.
