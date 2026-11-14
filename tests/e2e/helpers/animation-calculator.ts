import {
  PX_PER_WU,
  DURGAP,
  SNAP_MS_PER_WU,
  WU_WORD,
  WU_BODY,
  WU_CTA,
} from '../../../src/config/animation';

export type ElementState = 'visible' | 'partially' | 'invisible';

export interface ElementTiming {
  name: string;
  type: 'word' | 'blur-in';
  wu: number;
  duration: number;
  start: number;
}

export interface Section0Elements {
  w1: ElementTiming;
  w2: ElementTiming;
  w3: ElementTiming;
  w4: ElementTiming;
  w5: ElementTiming;
  w6: ElementTiming;
  p1: ElementTiming;
  cta1: ElementTiming;
}

export function buildSection0Elements(): Section0Elements {
  const elements: ElementTiming[] = [
    { name: 'w1', type: 'word', wu: WU_WORD, duration: 0, start: 0 },
    { name: 'w2', type: 'word', wu: WU_WORD, duration: 0, start: 0 },
    { name: 'w3', type: 'word', wu: WU_WORD, duration: 0, start: 0 },
    { name: 'w4', type: 'word', wu: WU_WORD, duration: 0, start: 0 },
    { name: 'w5', type: 'word', wu: WU_WORD, duration: 0, start: 0 },
    { name: 'w6', type: 'word', wu: WU_WORD, duration: 0, start: 0 },
    { name: 'p1', type: 'blur-in', wu: WU_BODY, duration: 0, start: 0 },
    { name: 'cta1', type: 'blur-in', wu: WU_CTA, duration: 0, start: 0 },
  ];

  for (const el of elements) {
    el.duration = el.wu * PX_PER_WU;
  }

  for (let i = 1; i < elements.length; i++) {
    elements[i].start = elements[i - 1].start + elements[i - 1].duration * DURGAP;
  }

  return {
    w1: elements[0],
    w2: elements[1],
    w3: elements[2],
    w4: elements[3],
    w5: elements[4],
    w6: elements[5],
    p1: elements[6],
    cta1: elements[7],
  };
}

export function computeExpectedStates(scrollWU: number): Record<string, ElementState> {
  const scrollPx = scrollWU * PX_PER_WU;
  const elements = buildSection0Elements();
  const allElements = [elements.w1, elements.w2, elements.w3, elements.w4, elements.w5, elements.w6, elements.p1, elements.cta1];

  const states: Record<string, ElementState> = {};

  for (const el of allElements) {
    const progress = (scrollPx - el.start) / el.duration;

    if (progress <= 0) {
      states[el.name] = 'visible';
    } else if (progress < 1) {
      states[el.name] = 'partially';
    } else {
      states[el.name] = 'invisible';
    }
  }

  return states;
}

export function getElementProgress(scrollWU: number, elementName: keyof Section0Elements): number {
  const scrollPx = scrollWU * PX_PER_WU;
  const elements = buildSection0Elements();
  const el = elements[elementName];
  return (scrollPx - el.start) / el.duration;
}

export function isSection0Active(scrollWU: number): boolean {
  const scrollPx = scrollWU * PX_PER_WU;
  const elements = buildSection0Elements();
  const lastEl = elements.cta1;
  const section0Width = lastEl.start + lastEl.duration; // outro span = intro span (no hold for section 0)
  return scrollPx < section0Width;
}

export function getSection0SpanWU(): number {
  const elements = buildSection0Elements();
  const lastEl = elements.cta1;
  return (lastEl.start + lastEl.duration) / PX_PER_WU;
}

export function wuToSnapSeconds(wu: number): number {
  return (wu * SNAP_MS_PER_WU) / 1000;
}

export function getSection0HalfWUCheckpoints(): number[] {
  const endWU = Math.ceil(getSection0SpanWU() * 2) / 2;
  const steps: number[] = [];
  for (let wu = 0; wu <= endWU + 1e-9; wu += 0.5) {
    steps.push(Number(wu.toFixed(2)));
  }
  return steps;
}
