# Landing Page — Section Sizes

Scroll line counts for the NuloCake landing page (`src/pages/index.astro`), following the [Scroll Line System](./sections-scroll.md).

## Section Inventory

| # | ID | Label | Header lines | Body | CTA | Gallery | Reviews | **N (Scroll Lines)** |
|---|---|---|---|---|---|---|---|---|
| 0 | `section-hero` | Hero | 2 | 1 | 1 | — | — | **4** |
| 1 | `section-story` | Story | 2 | 1 | 1 | — | — | **4** |
| 2 | `section-gallery` | Gallery | 2 | — | 1 | 1 | — | **4** |
| 3 | `section-testimonials` | Testimonials | 2 | — | — | — | 1 | **3** |
| 4 | `section-contact` | Contact | 2 | 1 | 1 | — | — | **4** |

## Computed Budgets

With `H = 2` (hold scroll lines):

| # | N | Budget (2N + H) | Cumulative start |
|---|---|---|---|
| 0 | 4 | 10 | 0 |
| 1 | 4 | 10 | 10 |
| 2 | 4 | 10 | 20 |
| 3 | 3 | 8 | 30 |
| 4 | 4 | 10 | 38 |
| **Total** | | **48 SL** | |

## Scroll Distance

| PX_PER_LINE | Total pixels | `end` value |
|---|---|---|
| 110 | 5280 | `+=5280` |
| 120 | 5760 | `+=5760` |
| 130 | 6240 | `+=6240` |

## Header Line Counts (Detail)

How each section's header lines were counted (visual lines split by `<br />`):

- **Section 0:** "Wymarzony tort" / "na Twoją wyjątkową okazję." → 2 lines
- **Section 1:** "Sztuka, która" / "zachwyca smakiem." → 2 lines
- **Section 2:** "Moje słodkie" / "dzieła sztuki" → 2 lines
- **Section 3:** "Co mówią moi" / "klienci?" → 2 lines
- **Section 4:** "Gotowy na swój" / "wymarzony tort?" → 2 lines

## Notes

- Section 3 (Testimonials) is the shortest — no body paragraph or CTA, just a heading and the testimonials block.
- All headers currently have 2 visual lines. If a header grows to 3+ lines, update the count and the budgets will automatically adjust.
- Section 0 uses a standalone time-based load animation for its intro (see [Scroll Line System](./sections-scroll.md#special-case-first-section-section-0)).
