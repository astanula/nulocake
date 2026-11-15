/**
 * Snap section navigation with unified edge-gated page scroll (Home v1 & Oferta v1).
 * Specs:
 * - docs/superpowers/specs/2026-11-13-home-snap-navigation-design.md
 * - docs/superpowers/specs/2026-11-13-section-dots-scroll-hint-design.md
 * - docs/superpowers/specs/2026-11-14-oferta-snap-navigation-design.md
 * - docs/superpowers/specs/2026-11-15-scroll-hint-bottom-overlay-design.md
 *
 * Input only requests a transition (one wheel/touch gesture past TRIGGER_PX at
 * the active section's scroll edge, or a key press). The transition then plays
 * segments of the paused master timeline by time, at SNAP_MS_PER_WU, to the
 * target section's resting point.
 */
import gsap from 'gsap';
import {
  PX_PER_WU,
  SNAP_MS_PER_WU,
  SNAP_EASE,
  TRIGGER_PX,
  WHEEL_QUIET_MS,
  EDGE_EPSILON_PX,
  EDGE_GUARD_MS,
} from '../config/animation';
import type { SectionTimeline } from './sectionTimeline';

type Dir = 1 | -1;

const PAGE_LOCK_CLASS = 'home-snap-active';
const SUBPIXEL_EPSILON_PX = 0.5;

const isMenuOpen = () => !!document.getElementById('nav-links')?.classList.contains('open');

const wheelDeltaPx = (e: WheelEvent) =>
  e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const isAtEdge = (dir: Dir) =>
  dir > 0
    ? maxScroll() - window.scrollY <= EDGE_EPSILON_PX
    : window.scrollY <= EDGE_EPSILON_PX;

/** Playback time (s) of a master timeline segment; depends only on its length. */
const segmentDuration = (a: number, b: number) =>
  (Math.abs(b - a) / PX_PER_WU) * SNAP_MS_PER_WU / 1000;

function getContentRoot(section: HTMLElement): HTMLElement {
  return section.querySelector<HTMLElement>(':scope > .hero-section-inner, :scope > .content-section-inner') ?? section;
}

function isLastItemFullyVisible(section: HTMLElement): boolean {
  const children = Array.from(getContentRoot(section).children) as HTMLElement[];
  for (let i = children.length - 1; i >= 0; i--) {
    const item = children[i];
    if (item.hidden || item.classList.contains('visually-hidden') || item.getClientRects().length === 0) continue;
    const rect = item.getBoundingClientRect();
    return rect.height > 0 && rect.bottom <= window.innerHeight + SUBPIXEL_EPSILON_PX;
  }
  return false;
}

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
  let activeOverride: number | null = null;
  let transition: gsap.core.Timeline | null = null;
  let hintVisible: boolean | null = null;
  let lastScrollY = window.scrollY;
  let lastNativeScroll = -Infinity;
  // A gesture is one touch, or a run of wheel events without a WHEEL_QUIET_MS gap.
  const wheel = { last: -Infinity, y: 0, scrolled: false, done: false };
  const touch = {
    x: 0,
    y: 0,
    startScrollY: 0,
    atTop: false,
    atBottom: false,
    scrolled: false,
    done: true,
    multi: false,
  };

  const locked = () => !!transition || isMenuOpen();

  function resetScrollTop() {
    window.scrollTo(0, 0);
    lastScrollY = window.scrollY;
  }

  // ── State ──────────────────────────────────────────

  /** Derives `is-active` from the master timeline position. */
  function applyActive() {
    const index = activeOverride ?? activeIndexAt(master.time());
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

  function setHint(visible: boolean) {
    if (!hint || visible === hintVisible) return;
    hintVisible = visible;
    hint.classList.toggle('is-hidden', !visible);
    hint.inert = !visible;
  }

  const updateHint = () => {
    if (!transition) setHint(current !== last && isLastItemFullyVisible(sections[current]));
  };

  // ── Transition ─────────────────────────────────────

  function goTo(to: number) {
    if (transition || to === current || to < 0 || to > last) return;

    const from = current;
    const focused = document.activeElement;
    const focusWasInside = sections[from].contains(focused) || (from === last && !!dock?.contains(focused));
    const focusWasOnHint = !!hint?.contains(focused);
    current = to;
    activeOverride = from;
    setDots(to);
    setHint(false);

    const tl = gsap.timeline({
      onComplete: () => {
        transition = null;
        activeOverride = null;
        applyActive();
        updateHint();
        if (focusWasInside || (focusWasOnHint && (!hint || hint.inert))) sections[to].focus({ preventScroll: true });
        // Hiding the hint (inert) dropped its focus; give it back if it is shown again.
        else if (focusWasOnHint) hint?.focus({ preventScroll: true });
      },
    });
    const seek = (pos: number) => tl.call(() => { master.seek(pos); applyActive(); });
    const enter = (pos: number) => tl.call(() => {
      activeOverride = to;
      master.seek(pos);
      applyActive();
      resetScrollTop();
    });
    const play = (a: number, b: number) =>
      tl.add(master.tweenFromTo(a, b, { duration: segmentDuration(a, b), ease: SNAP_EASE }));
    // Runs in parallel with the segment added just before it.
    const slideDock = (show: boolean, a: number, b: number) => {
      if (dock) tl.to(dock, { yPercent: show ? 0 : 100, duration: segmentDuration(a, b), ease: SNAP_EASE }, '<');
    };

    if (to > from) {
      seek(outroStart(from));
      play(outroStart(from), outroEnd(from));
      enter(sectionStarts[to]);
      play(sectionStarts[to], rest(to));
      if (to === last) slideDock(true, sectionStarts[to], rest(to));
    } else {
      play(rest(from), sectionStarts[from]);
      if (from === last) slideDock(false, rest(from), sectionStarts[from]);
      enter(outroEnd(to));
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

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y !== lastScrollY) {
      lastScrollY = y;
      if (!transition) {
        lastNativeScroll = performance.now();
        touch.scrolled = true;
        updateHint();
      }
    }
  }, { passive: true, signal });

  window.addEventListener('resize', updateHint, { passive: true, signal });
  window.visualViewport?.addEventListener('resize', updateHint, { passive: true, signal });

  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    if (now - wheel.last >= WHEEL_QUIET_MS) {
      wheel.y = 0;
      wheel.scrolled = false;
      wheel.done = false;
    }
    wheel.last = now;

    // ctrl + wheel is pinch-zoom on trackpads.
    if (locked()) {
      if (!e.ctrlKey && e.cancelable) e.preventDefault();
      wheel.done = true;
      return;
    }
    if (wheel.done || wheel.scrolled) return;
    if (e.ctrlKey) {
      wheel.done = true;
      return;
    }
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const dy = wheelDeltaPx(e);
    if (dy === 0) return;
    const dir: Dir = dy > 0 ? 1 : -1;
    if (!isAtEdge(dir) || now - lastNativeScroll < EDGE_GUARD_MS) {
      wheel.scrolled = true;
      return;
    }
    wheel.y += dy;
    wheel.done = triggerByDistance(wheel.y);
  }, { passive: false, signal });

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      touch.multi = true;
      touch.done = true;
      return;
    }
    const now = performance.now();
    const settled = now - lastNativeScroll >= EDGE_GUARD_MS;
    touch.multi = false;
    touch.x = e.touches[0].clientX;
    touch.y = e.touches[0].clientY;
    touch.startScrollY = window.scrollY;
    touch.atTop = settled && isAtEdge(-1);
    touch.atBottom = settled && isAtEdge(1);
    touch.scrolled = false;
    touch.done = locked();
  }, { passive: true, signal });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
      touch.multi = true;
      touch.done = true;
      return;
    }
    if (touch.multi) return;

    const dx = touch.x - e.touches[0].clientX;
    const dy = touch.y - e.touches[0].clientY;
    const vertical = Math.abs(dy) >= Math.abs(dx);

    if (locked()) {
      if (vertical && e.cancelable) e.preventDefault();
      touch.done = true;
      return;
    }

    if (touch.done || touch.scrolled) return;
    if (window.scrollY !== touch.startScrollY) {
      touch.scrolled = true;
      return;
    }
    if (!vertical || Math.abs(dy) <= TRIGGER_PX) return;

    const dir: Dir = dy > 0 ? 1 : -1;
    const startedAtEdge = dir > 0 ? touch.atBottom : touch.atTop;
    if (!startedAtEdge || !isAtEdge(dir)) {
      touch.scrolled = true;
      return;
    }
    touch.done = triggerByDistance(dy);
    if (locked() && e.cancelable) e.preventDefault();
  }, { passive: false, signal });

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isMenuOpen()) return;
    const el = e.target as HTMLElement;
    if (el.isContentEditable || el.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;

    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      goTo(e.key === 'Home' ? 0 : last);
      return;
    }

    let dir: Dir | 0 = 0;
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        dir = 1;
        break;
      case 'ArrowUp':
      case 'PageUp':
        dir = -1;
        break;
      case ' ':
        if (el.closest?.('button, summary, a, [role="button"]')) return;
        dir = e.shiftKey ? -1 : 1;
        break;
      default:
        return;
    }

    if (transition) {
      e.preventDefault();
      return;
    }
    if (!isAtEdge(dir)) return;

    e.preventDefault();
    if (performance.now() - lastNativeScroll >= EDGE_GUARD_MS) {
      goTo(current + dir);
    }
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
  const hintObserver = hint ? new ResizeObserver(updateHint) : null;
  sections.forEach((section) => {
    hintObserver?.observe(section);
    const content = getContentRoot(section);
    if (content !== section) hintObserver?.observe(content);
  });

  // ── Initial state ──────────────────────────────────

  document.documentElement.classList.add(PAGE_LOCK_CLASS);
  resetScrollTop();
  lastNativeScroll = -Infinity;
  if (dock) gsap.set(dock, { y: 0, yPercent: 100 });
  master.eventCallback('onUpdate', applyActive);
  master.seek(0);
  applyActive();
  setDots(0);
  updateHint();

  return () => {
    transition?.kill();
    transition = null;
    activeOverride = null;
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
