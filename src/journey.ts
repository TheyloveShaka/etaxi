import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TYRE_RADIUS_RATIO, bezier, find, token } from './hero';

gsap.registerPlugin(CustomEase, MotionPathPlugin, ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const SCRUB = 0.6;
const SCRUB_TOUCH = 0.3;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const FRONT_FACING_OFFSET = 180;
const HERO_RELEASE_PX = 1;
const NAV_SOLID_AT = 0.5;
const KERB_SIGNS_QUERY = '(min-width: 1024px)';
const ROAD_LEAD = 0.2;
const EXIT_RUN = 0.6;
const LANE_END_RUN = 0.5;
const ROAD_HEAD = 2;
const ROAD_TAIL = 1;
const PHONE_ONCOMING = 0.3;
const FACT_AT = 0.5;
const FACT_SPAN = 8;
const COPY_AT = 1;
const COPY_SPAN = 10;
const COPY_STAGGER = 1.2;
const LAND_SHARE = 0.5;
const LAND_SPAN = 14;
const LAND_STAGGER = 7;
const FILL_SPAN = 40;
const FILL_STAGGER = 12;
const ARRIVAL_SCALE = 1.12;
const PRESS_AT = 0.5;
const COMPACT_QUERY = '(max-width: 1023px)';
const COMPACT_LAND_DELAY = 19;
const MS_PER_SECOND = 1000;

interface Point {
  x: number;
  y: number;
}

interface Geo {
  width: number;
  height: number;
  mid: number;
  pinX: number;
  pinY: number;
  scale0: number;
  sideCentre: number;
  sideY: number;
  sideBottom: number;
  sideHeight: number;
  tyre: number;
  bandTop: number;
  bandBottom: number;
  copyBottom: number;
  roadY: number;
  roadTop: number;
  roadBottom: number;
  wipeDist: number;
  turnDist: number;
  roadDist: number;
  laneLength: number;
  exitY: number;
}

interface Traffic {
  el: HTMLElement;
  pass: number;
  speed: number;
}

function cssNumber(name: string): number {
  return parseFloat(token(name));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function initJourney(hero: gsap.core.Timeline | null): void {
  const section = find<HTMLElement>('[data-journey]');
  const view = find<HTMLElement>('[data-journey-view]', section);
  const ruler = find<HTMLElement>('[data-ruler]', view);
  const ground = find<HTMLElement>('[data-ground]', view);
  const van = find<HTMLElement>('[data-van]', view);
  const wheels = Array.from(van.querySelectorAll<HTMLElement>('[data-wheel]'));
  const copyBox = find<HTMLElement>('[data-hero-copy]', view);
  const copy = Array.from(copyBox.querySelectorAll<HTMLElement>(':scope > *'));
  const facts = Array.from(find<HTMLElement>('[data-facts]', view).querySelectorAll<HTMLElement>(':scope > li'));
  const worldClip = find<HTMLElement>('[data-world-clip]', view);
  const world = find<HTMLElement>('[data-world]', worldClip);
  const roadPath = find<SVGPathElement>('[data-road]', world);
  const centrePath = find<SVGPathElement>('[data-centre]', world);
  const lanePath = find<SVGPathElement>('[data-lane]', world);
  const trailPath = find<SVGPathElement>('[data-trail]', world);
  const vanTop = find<HTMLElement>('[data-van-top]', world);
  const signs = Array.from(world.querySelectorAll<HTMLElement>('[data-sign]'));
  const trafficAll = Array.from(world.querySelectorAll<HTMLElement>('[data-traffic]'));
  const title = find<HTMLElement>('[data-road-title]', view);
  const words = Array.from(title.querySelectorAll<HTMLElement>('[data-road-word]'));
  const stops = Array.from(view.querySelectorAll<HTMLElement>('[data-stop]'));
  const nav = find<HTMLElement>('[data-nav]');
  const arrival = find<HTMLElement>('[data-arrival]');
  const picture = find<HTMLElement>('[data-arrival-picture]', arrival);
  const arrivalCopy = Array.from(arrival.querySelectorAll<HTMLElement>('[data-arrival-copy] > *'));

  CustomEase.create('journey-roll', bezier('--ease-roll'));

  const state = { wipe: 0, turn: 0, anchor: 0, road: 0 };
  const here: Point = { x: 0, y: 0 };
  const ahead: Point = { x: 0, y: 0 };
  const behind: Point = { x: 0, y: 0 };
  let geo: Geo;
  let raw: ReturnType<typeof MotionPathPlugin.getRawPath> = [];
  let traffic: Traffic[] = [];
  let wheelBase: number[] | null = null;
  let activeStage = -1;

  const heroDone = (): boolean => hero === null || hero.progress() >= 1;

  const baseRotation = (): number[] => {
    if (!wheelBase) wheelBase = wheels.map((wheel) => Number(gsap.getProperty(wheel, 'rotation')));
    return wheelBase;
  };

  const sampleInto = (distance: number, into: Point): void => {
    const found = MotionPathPlugin.getPositionOnPath(
      raw,
      clamp01(distance / geo.laneLength),
    ) as Point;
    into.x = found.x;
    into.y = found.y;
  };

  function measure(): Geo {
    const style = getComputedStyle(ruler);
    const road = parseFloat(style.width);
    const lane = parseFloat(style.height);
    const roadX = parseFloat(style.left);
    const pinY = parseFloat(style.top);
    const mid = parseFloat(style.marginLeft);
    const turn = parseFloat(style.maxWidth);
    const topLen = parseFloat(style.maxHeight);
    const width = view.clientWidth;
    const height = view.clientHeight;

    const sideWidth = van.offsetWidth;
    const sideCentre = van.offsetLeft + sideWidth / 2;
    const sideHeight = van.offsetHeight;
    const scale0 = sideWidth / topLen;
    const wipeDist = (sideCentre - mid) / scale0;

    const arcRadius = turn - lane;
    const arcLength = (Math.PI / 2) * arcRadius;
    const startX = turn + mid / scale0 + road * ROAD_LEAD + wipeDist;
    const straightIn = startX - turn;
    const exitY = turn + road * EXIT_RUN;
    const roadDist = height * (cssNumber('--beat-3') / 100);
    const laneEndY = exitY + roadDist + road * LANE_END_RUN;
    const roadStartX = Math.max(startX + width / scale0, width) + road * ROAD_HEAD;
    const roadEndY = exitY + roadDist + (height - pinY) + road * ROAD_TAIL;
    const laneLength = straightIn + arcLength + (laneEndY - turn);
    const half = (scale0 * road) / 2;
    const roadY = height / 2 + scale0 * lane;

    const roadD = `M${roadStartX} 0H${turn}A${turn} ${turn} 0 0 0 0 ${turn}V${roadEndY}`;
    const laneD = `M${startX} ${lane}H${turn}A${arcRadius} ${arcRadius} 0 0 0 ${lane} ${turn}V${laneEndY}`;
    roadPath.setAttribute('d', roadD);
    centrePath.setAttribute('d', roadD);
    lanePath.setAttribute('d', laneD);
    trailPath.setAttribute('d', laneD);
    trailPath.style.strokeDasharray = `${laneLength} ${laneLength}`;

    geo = {
      width,
      height,
      mid,
      pinX: roadX + lane,
      pinY,
      scale0,
      sideCentre,
      sideY: van.offsetTop + sideHeight / 2,
      sideBottom: van.offsetTop + sideHeight,
      sideHeight,
      tyre: sideWidth * TYRE_RADIUS_RATIO,
      bandTop: ground.offsetTop,
      bandBottom: ground.offsetTop + ground.offsetHeight,
      copyBottom: copyBox.offsetTop + copyBox.offsetHeight,
      roadY,
      roadTop: height / 2 - half,
      roadBottom: height / 2 + half,
      wipeDist,
      turnDist: straightIn + arcLength + (exitY - turn),
      roadDist,
      laneLength,
      exitY,
    };

    raw = MotionPathPlugin.getRawPath(lanePath);
    MotionPathPlugin.cacheRawPathMeasurements(raw);

    const outer = lane > 0 && !window.matchMedia(KERB_SIGNS_QUERY).matches ? -1 : 1;
    signs.forEach((sign, index) => {
      gsap.set(sign, {
        x: (outer * road) / 2,
        y: exitY + (roadDist * (index + 0.5)) / signs.length,
        xPercent: outer < 0 ? -100 : 0,
        yPercent: -50,
      });
    });

    const oncomingX = -(lane > 0 ? lane : road * PHONE_ONCOMING);
    traffic = trafficAll
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => ({
        el,
        pass: parseFloat(el.dataset.pass ?? '0.5'),
        speed: parseFloat(el.dataset.speed ?? '1'),
      }));
    traffic.forEach((item) => {
      gsap.set(item.el, { x: oncomingX, xPercent: -50, yPercent: -50 });
    });

    return geo;
  }

  function apply(): void {
    const g = geo;
    const wipe = state.wipe;
    const distance =
      state.wipe * g.wipeDist + state.turn * (g.turnDist - g.wipeDist) + state.road * g.roadDist;

    sampleInto(distance, here);
    sampleInto(distance + 1, ahead);
    sampleInto(distance - 1, behind);
    const heading = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * RADIANS_TO_DEGREES;

    const scale = Math.pow(g.scale0, 1 - state.turn);
    const sideX = g.mid + Math.max(0, g.wipeDist - distance) * g.scale0;
    const anchorX = lerp(sideX, g.pinX, state.anchor);
    const anchorY = lerp(lerp(g.sideY, g.roadY, wipe), g.pinY, state.anchor);

    gsap.set(world, {
      x: anchorX - scale * here.x,
      y: anchorY - scale * here.y,
      scale,
      force3D: false,
    });
    gsap.set(vanTop, {
      x: here.x,
      y: here.y,
      rotation: heading - FRONT_FACING_OFFSET,
      force3D: false,
    });
    trailPath.style.strokeDashoffset = String(g.laneLength - distance);

    const edgeY = lerp(g.bandTop, g.roadTop, wipe);
    const bandEndY = lerp(g.bandBottom, g.roadBottom, wipe);
    gsap.set(ground, {
      y: edgeY - g.bandTop,
      scaleY: (bandEndY - edgeY) / (g.bandBottom - g.bandTop),
      transformOrigin: '50% 0%',
      visibility: wipe >= 1 ? 'hidden' : 'visible',
    });

    worldClip.style.clipPath = wipe >= 1 ? 'none' : `inset(${edgeY}px 0 0 0)`;
    van.style.clipPath =
      wipe <= 0
        ? 'none'
        : `inset(0 0 ${Math.min(g.sideHeight, Math.max(0, g.sideBottom - edgeY))}px 0)`;
    copyBox.style.clipPath =
      wipe <= 0
        ? 'none'
        : `inset(0 ${-g.width}px ${Math.max(0, g.copyBottom - edgeY)}px ${-g.width}px)`;

    if (heroDone()) {
      const shift = sideX - g.sideCentre;
      const base = baseRotation();
      gsap.set(van, { x: shift });
      gsap.set(wheels, { rotation: (index: number) => base[index] + (shift / g.tyre) * RADIANS_TO_DEGREES });
    }

    traffic.forEach((item) => {
      const y = g.exitY + g.roadDist * item.pass - item.speed * g.roadDist * (state.road - item.pass);
      gsap.set(item.el, { y });
    });
  }

  const tl = gsap.timeline({ paused: true });

  function sync(): void {
    const progress = state.road;
    const count = stops.length;
    const stage = progress <= 0 ? 0 : Math.min(count, Math.floor(progress * count) + 1);
    if (stage !== activeStage) {
      activeStage = stage;
      view.dataset.activeStage = String(stage);
      stops.forEach((stop, index) => stop.classList.toggle('is-active', index + 1 === stage));
    }
    stops.forEach((stop, index) => {
      const share = clamp01(progress * count - index);
      stop.style.setProperty('--p', share.toFixed(3));
      if (share > PRESS_AT) stop.dataset.pressed = 'true';
      else delete stop.dataset.pressed;
    });
    view.style.setProperty('--journey', tl.progress().toFixed(4));
    nav.classList.toggle('is-solid', tl.time() > NAV_SOLID_AT);
    copyBox.inert = tl.time() > EXIT_RUN;
  }

  function update(): void {
    apply();
    sync();
  }

  geo = measure();

  const beat2 = cssNumber('--beat-2');
  const beat3 = cssNumber('--beat-3');
  const cover = cssNumber('--cover');
  const wipeLen = beat2 * cssNumber('--wipe-share');
  const turnLen = beat2 - wipeLen;
  const lift = parseFloat(token('--sp-4'));
  const landAt = window.matchMedia(COMPACT_QUERY).matches
    ? beat2 + COMPACT_LAND_DELAY
    : wipeLen + turnLen * LAND_SHARE;
  const muted = token('--n-400');
  const fills = [token('--ink'), token('--ink'), token('--blue-700')];

  tl.eventCallback('onUpdate', update);
  tl.to(state, { wipe: 1, duration: wipeLen, ease: 'none' }, 0)
    .to(state, { turn: 1, duration: turnLen, ease: 'none' }, wipeLen)
    .to(state, { anchor: 1, duration: turnLen, ease: 'journey-roll' }, wipeLen)
    .to(state, { road: 1, duration: beat3, ease: 'none' }, beat2)
    .to({}, { duration: cover }, beat2 + beat3);

  tl.fromTo(
    facts,
    { opacity: 1, y: 0 },
    { opacity: 0, y: lift, duration: FACT_SPAN, ease: 'none', immediateRender: false },
    FACT_AT,
  );
  copy.forEach((element, index) => {
    tl.fromTo(
      element,
      { x: 0 },
      { x: () => -geo.width, duration: COPY_SPAN, ease: 'none', immediateRender: false },
      COPY_AT + index * COPY_STAGGER,
    );
  });
  words.forEach((word, index) => {
    tl.fromTo(
      word,
      { opacity: 0, y: lift },
      { opacity: 1, y: 0, duration: LAND_SPAN, ease: 'journey-roll', immediateRender: false },
      landAt + index * LAND_STAGGER,
    );
    tl.fromTo(
      word,
      { color: muted },
      { color: fills[index] ?? fills[0], duration: FILL_SPAN, ease: 'none', immediateRender: false },
      beat2 + index * FILL_STAGGER,
    );
  });

  gsap.set(world, { transformOrigin: '0 0' });

  ScrollTrigger.addEventListener('refreshInit', () => {
    geo = measure();
  });
  ScrollTrigger.addEventListener('refresh', update);

  ScrollTrigger.create({
    animation: tl,
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: ScrollTrigger.isTouch ? SCRUB_TOUCH : SCRUB,
    invalidateOnRefresh: true,
    onUpdate: () => {
      if (hero && hero.progress() < 1 && window.scrollY > HERO_RELEASE_PX) hero.progress(1);
    },
  });

  if (hero && window.scrollY > HERO_RELEASE_PX) hero.progress(1);

  const reveal = gsap.fromTo(
    arrivalCopy,
    { opacity: 0, y: lift },
    {
      opacity: 1,
      y: 0,
      duration: cssNumber('--t-enter') / MS_PER_SECOND,
      ease: 'journey-roll',
      paused: true,
    },
  );

  ScrollTrigger.create({
    trigger: arrival,
    start: 'top top',
    onEnter: () => {
      reveal.play();
    },
    onLeaveBack: () => {
      reveal.reverse();
    },
  });

  gsap.fromTo(
    picture,
    { scale: ARRIVAL_SCALE },
    {
      scale: 1,
      duration: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: arrival,
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: ScrollTrigger.isTouch ? SCRUB_TOUCH : SCRUB,
        invalidateOnRefresh: true,
      },
    },
  );

  update();
}
