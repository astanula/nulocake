# Gallery Preview Mode - Phase Improvements

This document tracks adjustments and improvements identified during the implementation of the Gallery Preview Mode phases.

## Phase 3 Adjustments

The following improvements were requested after the initial implementation of Phase 3 (Thumbnail Strip & Peeks):

1. **Peek Image Positioning**: The side peeks should not touch the browser edges. Instead, they must touch (or be adjacent to) the left and right edges of the current hero image itself.
2. **Counter Positioning**: The image counter (e.g., "6/16") should be displayed immediately below the hero image (with a small, configurable CSS margin) to avoid overlapping the hero image itself.
3. **Thumbnail Strip Positioning**: The thumbnail strip should be moved lower, placing it close to the bottom edge of the hero image/counter, rather than fixed to the bottom of the screen. The gap should be configurable via a CSS variable to prevent covering the hero image.
4. **Navigation Arrows Positioning**: The previous/next arrows should be relocated. The arrows should be next to the preview images (which should be on the sides of the main image), but at the same height as the thumbnail bar.
