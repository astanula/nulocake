# Spec: Interactive Infinite Looping Gallery

This specification outlines the design and implementation details for the infinite vertical scrolling image gallery in `src/pages/galeria.astro`.

## 1. Goal & Context
The goal is to build a premium, highly responsive, and interactive vertical gallery showcasing cake designs. The gallery consists of vertical columns of images that scroll infinitely in alternating directions (up/down). The animation pauses when the user hovers over any image.

## 2. Requirements & Parameters

### Spacing & Speed Configuration
All gallery layout and movement constants will be defined in a configuration file: `src/config/gallery.ts`.
- **Speeds**: Column speed is configurable per column (default is identical speeds).
- **Spacing**: Vertical gap between images inside a column is configurable.

### Responsiveness (Column Count)
- **Desktop (Wide screen)**: 4 columns.
- **Tablet (Medium screen)**: 3 columns.
- **Mobile (Small screen)**: 2 columns.
- All available images must be dynamically distributed across the active columns so that no image is excluded on smaller viewports (Option B).

### Looping Behavior (Approach 1)
- **Column 1**: Moves UP slowly.
- **Column 2**: Moves DOWN slowly.
- **Column 3**: Moves UP slowly.
- **Column 4**: Moves DOWN slowly.
- **Seamless Loop**: To make the scroll loop continuous and seamless without gaps or visual jumps, each column's assigned set of images is rendered twice in the DOM (e.g., `[A, B, C, D]` becomes `[A, B, C, D, A, B, C, D]`).
- The column container's position is translated using GSAP. When it scrolls by exactly half of its total height (`yPercent: -50` for scrolling up, or from `-50` to `0` for scrolling down), the animation instantly snaps back to the start. Because the two halves are visually identical, the loop is completely seamless.

### Interactivity
- **Hover state**: Hovering over any image in the gallery pauses the scrolling of **all columns** simultaneously to allow the user to inspect a cake. Leaving the hover resumes scrolling.

---

## 3. Proposed Technical Implementation

### File Structure
- `[NEW] src/config/gallery.ts`
- `[MODIFY] src/pages/galeria.astro`

### Step 1: Config Parameters
`src/config/gallery.ts` will contain:
```typescript
export const GALLERY_CONFIG = {
  // Speed in seconds for a full loop of a column (corresponds to translating -50%)
  columnSpeeds: [30, 30, 30, 30], // [col1, col2, col3, col4]
  // Vertical spacing between images
  imageGap: '20px', 
};
```

### Step 2: Dynamic Image Fetching (Compile-Time)
In `src/pages/galeria.astro` (Astro Frontmatter):
- Fetch all images under `src/assets/gallery/*.{jpeg,jpg,png,webp}` using `import.meta.glob`.
- Parse filename format `{column}-{row}.{ext}` to determine original design positions for sorted ordering.
- Pass the final array of images (containing source path, filename, width, height) down to client-side JS as a JSON string attribute on a DOM root node.

### Step 3: Distribution & DOM Construction (Client-Side)
In `src/pages/galeria.astro` (Client-Side Script):
- Listen to `DOMContentLoaded` / `astro:page-load` and window `resize` (debounced).
- Measure viewport width to choose number of columns $N \in \{2, 3, 4\}$.
- Distribute all images into $N$ columns round-robin.
- Create column wrapper elements:
  - Populate them with the distributed images (duplicated once).
  - Inject CSS styles (gap, width, flex column).
  - Clear and append these columns to the gallery container.

### Step 4: GSAP Loop Choreography
- For each column wrapper:
  - Create a timeline or tween.
  - Direction UP: `gsap.to(el, { yPercent: -50, duration: SPEED, ease: "none", repeat: -1 })`
  - Direction DOWN: `gsap.fromTo(el, { yPercent: -50 }, { yPercent: 0, duration: SPEED, ease: "none", repeat: -1 })`
  - Track all tweens in a global array `activeTweens`.
- Attach `mouseenter`/`mouseleave` to the parent gallery container:
  - Pause all: `activeTweens.forEach(t => t.pause())`
  - Play all: `activeTweens.forEach(t => t.play())`

---

## 4. Verification Plan

### Manual Verification
1. **Layout Check**: Verify the page shows 4 columns on large screens, 3 columns on medium screens, and 2 columns on mobile.
2. **Infinite Looping Check**: Verify columns scroll up/down continuously without flashing, jumping, or empty gaps.
3. **Hover Control Check**: Place the cursor over any image and verify that all columns pause moving immediately, then resume moving when the cursor is moved away.
4. **Dynamic Image Load Check**: Verify that adding a new dummy image `{col}-{row}.jpeg` to the assets directory automatically includes it in the compilation and layout without modifying the code.
