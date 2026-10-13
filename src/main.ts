import './styles/tokens.css';
import './styles/fonts.css';
import './styles/base.css';
import './styles/hero.css';
import './styles/journey.css';
import './styles/stops.css';
import './styles/screens.css';
import './styles/footer.css';
import './styles/static.css';
import { holdHero, initHero, motionAllowed, releaseHero } from './hero';
import { initJourney } from './journey';

const FONT_WAIT_MS = 1200;
const FONT_FACES = ['700 1em Panchang', '400 1em Switzer'];

function fontsReady(): Promise<unknown> {
  return Promise.all(FONT_FACES.map((face) => document.fonts.load(face)))
    .then(() => document.fonts.ready)
    .catch(() => undefined);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function start(): void {
  let hero: ReturnType<typeof initHero> | null = null;
  try {
    hero = initHero();
  } catch {
    releaseHero();
  }
  if (!motionAllowed()) return;
  try {
    initJourney(hero);
  } catch {
    document.documentElement.dataset.motion = 'off';
  }
}

document.documentElement.dataset.motion = motionAllowed() ? 'on' : 'off';
holdHero();
void Promise.race([fontsReady(), wait(FONT_WAIT_MS)]).then(start);

document.querySelectorAll<HTMLElement>('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
