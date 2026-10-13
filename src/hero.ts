import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

const HOLD_SELECTOR = '[data-van], [data-hero-copy], [data-facts]';
export const TYRE_RADIUS_RATIO = 0.0648;
const COPY_OFFSET_VW = 0.6;
const COPY_DELAY = 0.35;
const COPY_STAGGER = 0.06;
const FACT_STAGGER = 0.06;
const DIP_PX = 3;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export function token(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) throw new Error(`Missing token ${name}`);
  return value;
}

function seconds(name: string): number {
  const value = token(name);
  return value.endsWith('ms') ? parseFloat(value) / 1000 : parseFloat(value);
}

function pixels(name: string): number {
  return parseFloat(token(name));
}

export function bezier(name: string): string {
  const body = token(name).match(/cubic-bezier\(([^)]+)\)/)?.[1];
  if (!body) throw new Error(`Token ${name} is not a cubic-bezier`);
  return body.replace(/\s+/g, '');
}

export function find<T extends Element>(selector: string, scope: ParentNode = document): T {
  const element = scope.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

export function motionAllowed(): boolean {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !reduced && !connection?.saveData;
}

export function holdHero(): void {
  if (!motionAllowed()) return;
  gsap.set(document.querySelectorAll(HOLD_SELECTOR), { visibility: 'hidden' });
}

export function releaseHero(): void {
  gsap.set(document.querySelectorAll(HOLD_SELECTOR), { clearProps: 'visibility' });
}

export function initHero(): gsap.core.Timeline {
  if (!motionAllowed()) return gsap.timeline();

  const van = find<HTMLElement>('[data-van]');
  const body = find<HTMLElement>('[data-van-body]', van);
  const wheels = Array.from(van.querySelectorAll<HTMLElement>('[data-wheel]'));
  const copy = Array.from(find<HTMLElement>('[data-hero-copy]').querySelectorAll<HTMLElement>(':scope > *'));
  const facts = Array.from(find<HTMLElement>('[data-facts]').querySelectorAll<HTMLElement>(':scope > li'));

  CustomEase.create('roll', bezier('--ease-roll'));
  CustomEase.create('settle', bezier('--ease-settle'));

  const micro = seconds('--t-micro');
  const enter = seconds('--t-enter');
  const story = seconds('--t-story');
  const roll = enter + story;

  const startX = document.documentElement.clientWidth - van.offsetLeft;
  const radius = van.offsetWidth * TYRE_RADIUS_RATIO;

  gsap.set(van, { x: startX });
  gsap.set(copy, {
    x: (_index: number, target: Element) =>
      -Math.max(window.innerWidth * COPY_OFFSET_VW, target.getBoundingClientRect().right),
  });
  gsap.set(facts, { y: pixels('--sp-4'), opacity: 0 });
  releaseHero();

  const spin = (): void => {
    const travelled = startX - Number(gsap.getProperty(van, 'x'));
    gsap.set(wheels, { rotation: -(travelled / radius) * RADIANS_TO_DEGREES });
  };

  return gsap
    .timeline({ onUpdate: spin })
    .to(van, { x: 0, duration: roll, ease: 'roll' }, 0)
    .to(copy, { x: 0, duration: story, ease: 'roll', stagger: COPY_STAGGER }, COPY_DELAY)
    .addLabel('stop', roll)
    .to(body, { y: DIP_PX, duration: micro, ease: 'roll' }, 'stop')
    .to(body, { y: 0, duration: enter - micro, ease: 'settle' })
    .to(facts, { y: 0, opacity: 1, duration: enter, ease: 'roll', stagger: FACT_STAGGER });
}
