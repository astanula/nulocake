/**
 * Master timeline of the v1 section pages (Home and Oferta word/blur-in cascade).
 * Specs:
 * - docs/superpowers/specs/2026-11-13-home-snap-navigation-design.md
 * - docs/superpowers/specs/2026-11-14-oferta-snap-navigation-design.md
 *
 * Timeline units are px (PX_PER_WU per Word Unit). The timeline is created
 * paused and driven by time (see snapNavigator.ts), never by scroll.
 */
import gsap from 'gsap';
import {
  PX_PER_WU,
  DURGAP,
  HOLD,
  FDUR_RATIO,
  LIFT_PX,
  BLUR_MAX_PX,
  BLUR_MIN_PX,
  BLUR_RANGE,
  BRIGHTNESS_MIN,
  BRIGHTNESS_MAX,
  SCALE_INTRO,
  SCALE_OUTRO,
  SCALE_VARIATION,
  SCALE_VARIATION_FREQ,
  ROTATEX_DEG,
  WU_WORD,
  WU_BODY,
  WU_CTA,
  WU_CAROUSEL,
} from '../config/animation';

export type AnimElement = {
  el: Element;
  wu: number;
  duration: number;
  start: number;
  type: 'word' | 'blur-in';
};

export type SectionData = {
  section: HTMLElement;
  elements: AnimElement[];
  introSpan: number;
  sw: number;
};

export type SectionLayout = {
  sectionData: SectionData[];
  sectionStarts: number[];
  totalDuration: number;
};

export type SectionTimeline = {
  tl: gsap.core.Timeline;
  sections: HTMLElement[];
  sectionStarts: number[];
  /** Fully visible, resting point of section i. */
  rest: (i: number) => number;
  /** First frame of section i's outro. */
  outroStart: (i: number) => number;
  /** Section i hidden (= start of section i + 1). */
  outroEnd: (i: number) => number;
  /** Index of the section whose range contains the timeline position. */
  activeIndexAt: (pos: number) => number;
};

const HOLD_PX = HOLD * PX_PER_WU;

function getBlurInWeight(el: Element): number {
  if (el.classList.contains('gallery-carousel')) return WU_CAROUSEL;
  if (el.classList.contains('testimonials-carousel')) return WU_CAROUSEL;
  if (el.classList.contains('section-cta-group')) return WU_CTA;
  return WU_BODY;
}

function buildSectionElements(section: HTMLElement): AnimElement[] {
  const words = Array.from(section.querySelectorAll('.word'));
  const blurIns = Array.from(section.querySelectorAll('.blur-in'));
  const elems: AnimElement[] = [];

  for (const w of words) {
    elems.push({ el: w, wu: WU_WORD, duration: 0, start: 0, type: 'word' });
  }
  for (const b of blurIns) {
    elems.push({ el: b, wu: getBlurInWeight(b), duration: 0, start: 0, type: 'blur-in' });
  }

  for (let j = 0; j < elems.length; j++) {
    elems[j].duration = elems[j].wu * PX_PER_WU;
    elems[j].start = j === 0
      ? 0
      : elems[j - 1].start + elems[j - 1].duration * DURGAP;
  }
  return elems;
}

export function computeSectionData(sections: HTMLElement[]): SectionLayout {
  const sectionData = sections.map((section, i) => {
    const elements = buildSectionElements(section);
    const last = elements[elements.length - 1];
    const introSpan = last.start + last.duration;
    const sw = (i === 0) ? introSpan : introSpan + HOLD_PX + introSpan;
    return { section, elements, introSpan, sw };
  });

  const sectionStarts: number[] = [];
  let cumulative = 0;
  for (const data of sectionData) {
    sectionStarts.push(cumulative);
    cumulative += data.sw;
  }
  const totalDuration = cumulative;

  return { sectionData, sectionStarts, totalDuration };
}

/** Builds the paused master timeline. Sections i > 0 are set to their hidden intro state. */
export function buildSectionTimeline({ sectionData, sectionStarts, totalDuration }: SectionLayout): SectionTimeline {
  const last = sectionData.length - 1;
  const rest = (i: number) => (i === 0 ? 0 : sectionStarts[i] + sectionData[i].introSpan);
  const outroStart = (i: number) => (i === 0 ? 0 : rest(i) + HOLD_PX);
  const outroEnd = (i: number) => (i < last ? sectionStarts[i + 1] : totalDuration);
  const activeIndexAt = (pos: number) => {
    const k = sectionData.findIndex((data, idx) => pos < sectionStarts[idx] + data.sw);
    return k === -1 ? last : k;
  };

  const tl = gsap.timeline({ paused: true });

  sectionData.forEach((data, i) => {
    const { elements } = data;
    const secStart = sectionStarts[i];

    if (i > 0) {
      const prevDisplay = data.section.style.display;
      if (getComputedStyle(data.section).display === 'none') {
        data.section.style.display = 'flex';
      }
      elements.forEach((elem) => {
        if (elem.type === 'word') {
          gsap.set(elem.el, {
            opacity: 0, filter: `blur(${BLUR_MAX_PX}px) brightness(${BRIGHTNESS_MIN})`,
            y: LIFT_PX, scale: SCALE_INTRO, rotateX: -ROTATEX_DEG
          });
        } else {
          gsap.set(elem.el, { opacity: 0, filter: `blur(${BLUR_MAX_PX}px)`, y: LIFT_PX });
        }
      });
      data.section.style.display = prevDisplay;

      elements.forEach((elem, idx) => {
        const dur = elem.duration;
        const fdur = dur * FDUR_RATIO;
        const pos = secStart + elem.start;

        if (elem.type === 'word') {
          const blur = BLUR_MIN_PX + Math.floor(Math.random() * BLUR_RANGE);
          const scale = SCALE_INTRO + Math.sin(idx * SCALE_VARIATION_FREQ) * SCALE_VARIATION;
          tl.set(elem.el, { filter: `blur(${blur}px) brightness(${BRIGHTNESS_MIN})`, scale }, secStart);
          tl.to(elem.el, {
            opacity: 1, y: 0, scale: 1, rotateX: 0,
            duration: dur, ease: 'none'
          }, pos);
          tl.to(elem.el, {
            filter: `blur(0px) brightness(${BRIGHTNESS_MAX})`,
            duration: fdur, ease: 'none'
          }, pos);
        } else {
          tl.to(elem.el, {
            opacity: 1, y: 0,
            duration: dur, ease: 'none'
          }, pos);
          tl.to(elem.el, {
            filter: `blur(0px)`,
            duration: fdur, ease: 'none'
          }, pos);
        }
      });
    }

    if (i < last) {
      elements.forEach((elem) => {
        const dur = elem.duration;
        const fdur = dur * FDUR_RATIO;
        const pos = outroStart(i) + elem.start;

        if (elem.type === 'word') {
          if (i === 0) tl.set(elem.el, { filter: `blur(0px) brightness(${BRIGHTNESS_MAX})` }, pos);
          tl.to(elem.el, {
            opacity: 0, y: -LIFT_PX, scale: SCALE_OUTRO, rotateX: ROTATEX_DEG,
            duration: dur, ease: 'none'
          }, pos);
          tl.to(elem.el, {
            filter: `blur(${BLUR_MAX_PX}px) brightness(${BRIGHTNESS_MIN})`,
            duration: fdur, ease: 'none'
          }, pos);
        } else {
          if (i === 0) tl.set(elem.el, { filter: `blur(0px)` }, pos);
          tl.to(elem.el, {
            opacity: 0, y: -LIFT_PX,
            duration: dur, ease: 'none'
          }, pos);
          tl.to(elem.el, {
            filter: `blur(${BLUR_MAX_PX}px)`,
            duration: fdur, ease: 'none'
          }, pos);
        }
      });
    }
  });

  tl.set({}, {}, totalDuration);

  return {
    tl,
    sections: sectionData.map((d) => d.section),
    sectionStarts,
    rest,
    outroStart,
    outroEnd,
    activeIndexAt,
  };
}
