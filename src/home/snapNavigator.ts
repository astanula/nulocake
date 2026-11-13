/**
 * Snap section navigation for the v1 home page.
 * Spec: docs/superpowers/specs/2026-11-13-home-snap-navigation-design.md
 * Dots and scroll hint: docs/superpowers/specs/2026-11-13-section-dots-scroll-hint-design.md
 *
 * Input only requests a transition (one wheel/touch gesture past TRIGGER_PX,
 * or a key press). The transition then plays segments of the paused master
 * timeline by time, at SNAP_MS_PER_WU, to the target section's resting point.
 */
import gsap from 'gsap';
import {
  PX_PER_WU,
  SNAP_MS_PER_WU,
  SNAP_EASE,
  TRIGGER_PX,
  WHEEL_QUIET_MS,
  SCROLL_HINT_GAP_PX,
} from '../config/animation';
import type { SectionTimeline } from './sectionTimeline';

const PAGE_LOCK_CLASS = 'home-snap-active';

const isMenuOpen = () => !!document.getElementById('nav-links')?.classList.contains('open');

const wheelDeltaPx = (e: WheelEvent) =>
  e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);

/** Playback time (s) of a master timeline segment; depends only on its length. */
const segmentDuration = (a: number, b: number) =>
  (Math.abs(b - a) / PX_PER_WU) * SNAP_MS_PER_WU / 1000;

export function mountSnapNavigator(root: HTMLElement, timeline: SectionTimeline): () => void {
  const { tl: master, sections, sectionStarts, rest, outroStart, outroEnd, activeIndexAt } = timeline;
  const last = sections.length - 1;
  const dock = root.querySelector<HTMLElement>('.home-footer-dock');
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-section-dot]'));
  const hint = root.querySelector<HTMLButtonElement>('[data-scroll-hint]');
  const controller = new AbortController();
  const { signal } = controller;

  let current = 0;
  let shown = -1;
  let transition: gsap.core.Timeline | null = null;
  // A gesture is one touch, or a run of wheel events without a WHEEL_QUIET_MS gap.
  const wheel = { last: -Infinity, y: 0, done: false };
  const touch = { x: 0, y: 0, done: true };

  const locked = () => !!transition || isMenuOpen();

  // ── State ──────────────────────────────────────────

  /** Derives `is-active` from the master timeline position. */
  function applyActive() {
    const index = activeIndexAt(master.time());
    if (index === shown) return;
    shown = index;
    sections.forEach((sec, i) => sec.classList.toggle('is-active', i === index));
    if (dock) dock.inert = index !== last;
  }

  function setDots(index: number) {
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  // ── Scroll hint ────────────────────────────────────

  /** Content ends above the hint. Layout offsets ignore transforms. */
  function fitsAboveHint(sec: HTMLElement) {
    const parent = sec.offsetParent;
    if (!hint || !parent) return false;
    const contentBottom = Array.from(sec.children as HTMLCollectionOf<HTMLElement>)
      .reduce((max, el) => Math.max(max, el.offsetTop + el.offsetHeight), 0);
    const secTop = parent.getBoundingClientRect().top + sec.offsetTop;
    return secTop + contentBottom + SCROLL_HINT_GAP_PX <= hint.getBoundingClientRect().top;
  }

  function setHint(visible: boolean) {
    if (!hint) return;
    hint.classList.toggle('is-hidden', !visible);
    hint.inert = !visible;
  }

  const updateHint = () => {
    if (!transition) setHint(current !== last && fitsAboveHint(sections[current]));
  };

  // ── Transition ─────────────────────────────────────

  function goTo(to: number) {
    if (transition || to === current || to < 0 || to > last) return;

    const from = current;
    const focused = document.activeElement;
    const focusWasInside = sections[from].contains(focused) || (from === last && !!dock?.contains(focused));
    const focusWasOnHint = !!hint?.contains(focused);
    current = to;
    setDots(to);
    setHint(false);

    const tl = gsap.timeline({
      onComplete: () => {
        transition = null;
        updateHint();
        if (focusWasInside || (focusWasOnHint && hint?.inert)) sections[to].focus({ preventScroll: true });
        // Hiding the hint (inert) dropped its focus; give it back if it is shown again.
        else if (focusWasOnHint) hint?.focus({ preventScroll: true });
      },
    });
    const seek = (pos: number) => tl.call(() => { master.seek(pos); applyActive(); });
    const play = (a: number, b: number) =>
      tl.add(master.tweenFromTo(a, b, { duration: segmentDuration(a, b), ease: SNAP_EASE }));
    // Runs in parallel with the segment added just before it.
    const slideDock = (show: boolean, a: number, b: number) => {
      if (dock) tl.to(dock, { yPercent: show ? 0 : 100, duration: segmentDuration(a, b), ease: SNAP_EASE }, '<');
    };

    if (to > from) {
      seek(outroStart(from));
      play(outroStart(from), outroEnd(from));
      if (to > from + 1) seek(sectionStarts[to]);
      play(sectionStarts[to], rest(to));
      if (to === last) slideDock(true, sectionStarts[to], rest(to));
    } else {
      play(rest(from), sectionStarts[from]);
      if (from === last) slideDock(false, rest(from), sectionStarts[from]);
      if (to < from - 1) seek(outroEnd(to));
      play(outroEnd(to), outroStart(to));
      seek(rest(to));
    }

    transition = tl;
  }

  /** Requests a step once the gesture's vertical distance exceeds TRIGGER_PX. Returns true if it fired. */
  function triggerByDistance(dy: number) {
    if (Math.abs(dy) <= TRIGGER_PX) return false;
    goTo(current + Math.sign(dy));
    return true;
  }

  // ── Input ──────────────────────────────────────────

  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    if (now - wheel.last >= WHEEL_QUIET_MS) {
      wheel.y = 0;
      wheel.done = false;
    }
    wheel.last = now;
    if (wheel.done) return;
    // ctrl + wheel is pinch-zoom on trackpads.
    if (locked() || e.ctrlKey) {
      wheel.done = true;
      return;
    }
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    wheel.y += wheelDeltaPx(e);
    wheel.done = triggerByDistance(wheel.y);
  }, { passive: true, signal });

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      touch.done = true;
      return;
    }
    touch.x = e.touches[0].clientX;
    touch.y = e.touches[0].clientY;
    touch.done = locked();
  }, { passive: true, signal });

  window.addEventListener('touchmove', (e) => {
    if (touch.done) return;
    if (locked() || e.touches.length > 1) {
      touch.done = true;
      return;
    }
    const dx = touch.x - e.touches[0].clientX;
    const dy = touch.y - e.touches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy)) return;
    touch.done = triggerByDistance(dy);
  }, { passive: true, signal });

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isMenuOpen()) return;
    const el = e.target as HTMLElement;
    if (el.isContentEditable || el.closest?.('input, textarea, select')) return;

    let target: number;
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        target = current + 1;
        break;
      case 'ArrowUp':
      case 'PageUp':
        target = current - 1;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = last;
        break;
      case ' ':
        if (el.closest?.('button, [role="button"]')) return;
        target = current + (e.shiftKey ? -1 : 1);
        break;
      default:
        return;
    }

    e.preventDefault();
    goTo(target);
  }, { signal });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      if (!isMenuOpen()) goTo(Number(dot.dataset.sectionDot));
    }, { signal });
  });

  hint?.addEventListener('click', () => {
    if (!isMenuOpen()) goTo(current + 1);
  }, { signal });

  const footerObserver = dock
    ? new ResizeObserver(() => root.style.setProperty('--home-footer-h', `${dock.offsetHeight}px`))
    : null;
  if (dock) footerObserver?.observe(dock);

  // Re-check the hint when sections resize (viewport) or their content does (fonts, images).
  const hintObserver = hint ? new ResizeObserver(updateHint) : null;
  sections.forEach((sec) => {
    hintObserver?.observe(sec);
    Array.from(sec.children).forEach((el) => hintObserver?.observe(el));
  });

  // ── Initial state ──────────────────────────────────

  document.documentElement.classList.add(PAGE_LOCK_CLASS);
  window.scrollTo(0, 0);
  if (dock) gsap.set(dock, { y: 0, yPercent: 100 });
  master.eventCallback('onUpdate', applyActive);
  master.seek(0);
  applyActive();
  setDots(0);
  updateHint();

  return () => {
    transition?.kill();
    transition = null;
    master.kill();
    controller.abort();
    footerObserver?.disconnect();
    hintObserver?.disconnect();
    setHint(false);
    setDots(0);
    document.documentElement.classList.remove(PAGE_LOCK_CLASS);
    if (dock) {
      gsap.set(dock, { clearProps: 'all' });
      dock.inert = false;
    }
    root.style.removeProperty('--home-footer-h');
  };
}
