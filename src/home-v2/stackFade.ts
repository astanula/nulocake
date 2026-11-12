/**
 * Stack fade section navigation for the v2 home page.
 * Spec: docs/superpowers/specs/2026-11-12-home-v2-stack-fade-design.md
 *
 * One wheel/swipe gesture, key press or dot click = one fixed-duration
 * transition. Tall sections scroll natively first; a transition fires only
 * from their top/bottom edge, with a fresh gesture.
 */
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import {
  TRANSITION_S,
  TRANSITION_EASE,
  SCALE_PAST,
  OPACITY_PAST,
  EDGE_GUARD_MS,
  WHEEL_QUIET_MS,
  OBSERVER_TOLERANCE,
  EDGE_EPSILON_PX,
  KEY_SCROLL_RATIO,
  REDUCED_MOTION_S,
} from './config';

declare global {
  interface Window {
    homeV2PageLoadAdded?: boolean;
    homeV2BeforeSwapAdded?: boolean;
  }
}

type Dir = 1 | -1;

const TRANSIENT_PROPS = 'transform,opacity,visibility,zIndex';

const isMenuOpen = () => !!document.getElementById('nav-links')?.classList.contains('open');

const wheelDeltaPx = (e: WheelEvent) =>
  e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);

export function mountStackFade(root: HTMLElement): () => void {
  const sections = Array.from(root.querySelectorAll<HTMLElement>('.v2-section'));
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-v2-dot]'));
  const footerDock = root.querySelector<HTMLElement>('.v2-footer-dock');
  const last = sections.length - 1;
  if (last < 0) return () => {};

  const controller = new AbortController();
  const { signal } = controller;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let reducedMotion = motionQuery.matches;
  let active = 0;
  let tl: gsap.core.Timeline | null = null;
  let lastInnerScroll = -Infinity;
  // A gesture is one touch, or a run of wheel events without a WHEEL_QUIET_MS gap.
  const gesture = { id: 0, start: 0, lastWheel: -Infinity };
  let consumedGesture = -1;

  // ── State ──────────────────────────────────────────

  function setActive(index: number) {
    active = index;
    sections.forEach((sec, i) => {
      sec.classList.toggle('is-active', i === index);
      sec.inert = i !== index;
    });
    if (footerDock) footerDock.inert = index !== last;
  }

  function setDots(index: number) {
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  const maxScroll = (sec: HTMLElement) => sec.scrollHeight - sec.clientHeight;

  function isScrolledToEdge(dir: Dir) {
    const sec = sections[active];
    return dir > 0
      ? maxScroll(sec) - sec.scrollTop <= EDGE_EPSILON_PX
      : sec.scrollTop <= EDGE_EPSILON_PX;
  }

  // ── Transition ─────────────────────────────────────

  function goTo(target: number) {
    if (tl || target === active || target < 0 || target > last) return;

    const from = active;
    const dir: Dir = target > from ? 1 : -1;
    const current = sections[from];
    const next = sections[target];
    const focusWasInside = current.contains(document.activeElement);

    next.scrollTop = dir > 0 ? 0 : maxScroll(next);
    setDots(target);

    tl = gsap.timeline({
      defaults: { duration: reducedMotion ? REDUCED_MOTION_S : TRANSITION_S, ease: TRANSITION_EASE },
      onComplete: () => {
        setActive(target);
        gsap.set([current, next], { clearProps: TRANSIENT_PROPS });
        if (focusWasInside) next.focus({ preventScroll: true });
        tl = null;
      },
    });

    gsap.set(next, { visibility: 'visible', zIndex: dir > 0 ? 2 : 1 });
    gsap.set(current, { zIndex: dir > 0 ? 1 : 2 });

    if (reducedMotion) {
      tl.fromTo(next, { opacity: 0 }, { opacity: 1 }, 0).to(current, { opacity: 0 }, 0);
    } else if (dir > 0) {
      tl.fromTo(next, { yPercent: 100 }, { yPercent: 0 }, 0)
        .to(current, { scale: SCALE_PAST, opacity: OPACITY_PAST }, 0);
    } else {
      tl.fromTo(next, { scale: SCALE_PAST, opacity: OPACITY_PAST }, { scale: 1, opacity: 1 }, 0)
        .to(current, { yPercent: 100 }, 0);
    }

    if (footerDock && (target === last || from === last)) {
      const show = target === last;
      if (reducedMotion) {
        if (show) tl.set(footerDock, { yPercent: 0 }, 0);
        tl.fromTo(footerDock, { opacity: show ? 0 : 1 }, { opacity: show ? 1 : 0 }, 0);
        if (!show) tl.set(footerDock, { yPercent: 100, opacity: 1 });
      } else {
        tl.to(footerDock, { yPercent: show ? 0 : 100 }, 0);
      }
    }
  }

  /** Adjacent step requested by a wheel/touch gesture or a key press. */
  function step(dir: Dir, fromGesture: boolean) {
    if (tl || isMenuOpen()) return;
    if (fromGesture && gesture.id === consumedGesture) return;
    const target = active + dir;
    if (target < 0 || target > last || !isScrolledToEdge(dir)) return;

    const inputStart = fromGesture ? gesture.start : performance.now();
    const settled = performance.now() - lastInnerScroll >= EDGE_GUARD_MS;
    if (!settled || inputStart <= lastInnerScroll) return;

    if (fromGesture) consumedGesture = gesture.id;
    goTo(target);
  }

  // ── Input ──────────────────────────────────────────

  // Registered before the Observer so gesture bookkeeping precedes its (rAF-debounced) callbacks.
  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    if (now - gesture.lastWheel >= WHEEL_QUIET_MS) {
      gesture.id++;
      gesture.start = now;
    }
    gesture.lastWheel = now;

    // Wheel outside the active section (e.g. over the image) still scrolls it.
    const sec = sections[active];
    if (!tl && !isMenuOpen() && !sec.contains(e.target as Node)) {
      sec.scrollBy({ top: wheelDeltaPx(e) });
    }
  }, { passive: true, signal });

  window.addEventListener('touchstart', () => {
    gesture.id++;
    gesture.start = performance.now();
  }, { passive: true, signal });

  sections.forEach((sec) => {
    sec.addEventListener('scroll', () => {
      if (sec === sections[active]) lastInnerScroll = performance.now();
    }, { passive: true, signal });
  });

  const observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    wheelSpeed: -1,
    tolerance: OBSERVER_TOLERANCE,
    preventDefault: false,
    onUp: () => step(1, true),
    onDown: () => step(-1, true),
  });

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isMenuOpen()) return;
    const el = e.target as HTMLElement;
    if (el.closest?.('input, textarea, select, [contenteditable]')) return;

    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      goTo(e.key === 'Home' ? 0 : last);
      return;
    }

    let dir: Dir | 0 = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') dir = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') dir = -1;
    else if (e.key === ' ' && !el.closest?.('button, [role="button"]')) dir = e.shiftKey ? -1 : 1;
    if (!dir) return;

    e.preventDefault();
    if (tl) return;
    if (isScrolledToEdge(dir)) {
      step(dir, false);
    } else {
      const sec = sections[active];
      sec.scrollBy({
        top: dir * sec.clientHeight * KEY_SCROLL_RATIO,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    }
  }, { signal });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => goTo(Number(dot.dataset.v2Dot)), { signal });
  });

  motionQuery.addEventListener('change', (e) => { reducedMotion = e.matches; }, { signal });

  const footerObserver = footerDock
    ? new ResizeObserver(() => root.style.setProperty('--v2-footer-h', `${footerDock.offsetHeight}px`))
    : null;
  if (footerDock) footerObserver?.observe(footerDock);

  // ── Initial state ──────────────────────────────────

  gsap.set(sections, { clearProps: TRANSIENT_PROPS });
  sections.forEach((sec) => { sec.scrollTop = 0; });
  if (footerDock) gsap.set(footerDock, { y: 0, yPercent: 100, opacity: 1 });
  setActive(0);
  setDots(0);

  return () => {
    tl?.kill();
    tl = null;
    observer.kill();
    controller.abort();
    footerObserver?.disconnect();
    gsap.set(sections, { clearProps: TRANSIENT_PROPS });
    if (footerDock) gsap.set(footerDock, { clearProps: 'all' });
    root.style.removeProperty('--v2-footer-h');
  };
}
