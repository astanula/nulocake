/**
 * Testimonials carousel for the v2 home page (ported from v1).
 * Auto-play every 10s, manual nav with arrows, swipe and ArrowLeft/ArrowRight.
 * Returns a teardown that stops auto-play and removes all listeners.
 */

const AUTO_PLAY_DELAY = 10000;
const SLIDE_WIDTH_PCT = 80;
const SWIPE_MIN_PX = 50;

export function initTestimonials(carousel: HTMLElement): () => void {
  const track = carousel.querySelector<HTMLElement>('.v2-carousel-track');
  const slides = carousel.querySelectorAll('.v2-carousel-slide');
  const prevBtn = carousel.querySelector<HTMLButtonElement>('#v2-carousel-prev');
  const nextBtn = carousel.querySelector<HTMLButtonElement>('#v2-carousel-next');

  if (!track || slides.length === 0) return () => {};

  const controller = new AbortController();
  const { signal } = controller;
  let currentIndex = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let touchStartX = 0;

  function update(animate = true) {
    track!.style.transition = animate ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
    track!.style.transform = `translateX(${-(currentIndex * SLIDE_WIDTH_PCT)}%)`;
  }

  function stopAutoPlay() {
    if (interval) clearInterval(interval);
    interval = null;
  }

  function startAutoPlay() {
    stopAutoPlay();
    interval = setInterval(goToNext, AUTO_PLAY_DELAY);
  }

  function goTo(index: number) {
    currentIndex = (index + slides.length) % slides.length;
    update();
    startAutoPlay();
  }

  function goToPrev() { goTo(currentIndex - 1); }
  function goToNext() { goTo(currentIndex + 1); }

  prevBtn?.addEventListener('click', goToPrev, { signal });
  nextBtn?.addEventListener('click', goToNext, { signal });

  carousel.addEventListener('mouseenter', stopAutoPlay, { signal });
  carousel.addEventListener('mouseleave', startAutoPlay, { signal });
  carousel.addEventListener('focusin', stopAutoPlay, { signal });
  carousel.addEventListener('focusout', startAutoPlay, { signal });

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true, signal });

  carousel.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > SWIPE_MIN_PX) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
  }, { passive: true, signal });

  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goToPrev();
    if (e.key === 'ArrowRight') goToNext();
  }, { signal });

  update(false);
  startAutoPlay();

  return () => {
    stopAutoPlay();
    controller.abort();
  };
}
