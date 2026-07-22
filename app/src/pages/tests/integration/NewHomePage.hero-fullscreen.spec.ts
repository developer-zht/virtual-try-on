import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('./NewHomePage.vue', import.meta.url), 'utf8');
const iconSource = readFileSync(new URL('../components/icons/icons.ts', import.meta.url), 'utf8');

describe('NewHomePage HERO full-screen integration', () => {
  it('keeps one HERO DOM and delegates its route-backed FLIP state', () => {
    expect(pageSource.match(/<section\b[^>]*class="hero/g)).toHaveLength(1);
    expect(pageSource).toContain("from '@/composables/useHeroFullscreen'");
    expect(pageSource).toContain('ref="heroEl"');
    expect(pageSource).toContain("'hero--fullscreen': isHeroFullscreen");
  });

  it('only exposes expansion for a completed image and supports keyboard entry', () => {
    expect(pageSource).toContain('const canExpandHero = computed(() => Boolean(heroImage.value))');
    expect(pageSource).toContain(':tabindex="canExpandHero && !isHeroFullscreen ? 0 : undefined"');
    expect(pageSource).toContain(
      ':role="canExpandHero && !isHeroFullscreen ? \'button\' : undefined"',
    );
    expect(pageSource).toContain('@keydown.enter.prevent="openHero"');
    expect(pageSource).toContain('v-if="canExpandHero && !isHeroFullscreen"');
  });

  it('locks background scrolling only while the fixed HERO is open', () => {
    expect(pageSource).toContain("document.body.style.overflow = 'hidden'");
    expect(pageSource).toContain('restoreHeroBodyScroll()');
  });

  it('renders the full-screen close state and weather layer without duplicating the HERO', () => {
    expect(pageSource).toContain('v-if="isHeroFullscreen"');
    expect(pageSource).toContain('<WeatherCanvas');
    expect(pageSource).toContain('aria-label="退出全屏浏览"');
    expect(pageSource).toContain('@click.stop="closeHero"');
  });

  it('keeps favorite clicks inside the card instead of expanding the HERO', () => {
    expect(pageSource).toContain('@click.stop="addToLike(currentOutfit?.id)"');
  });

  it('does not implement a competing custom swipe recognizer', () => {
    expect(pageSource).not.toContain('@touchstart');
    expect(pageSource).not.toContain('@touchmove');
    expect(pageSource).not.toContain('@pointerdown');
  });

  it('adds matching outline icons for expansion and closing', () => {
    expect(iconSource).toMatch(/\bexpand:/);
    expect(iconSource).toMatch(/\bclose:/);
  });
});
