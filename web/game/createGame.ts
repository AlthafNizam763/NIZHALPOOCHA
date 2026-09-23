import * as Phaser from 'phaser';
import { useSettings } from '@/state/settingsStore';
import { WorldScene } from './scenes/WorldScene';

/**
 * Creates the Phaser game inside `parent`. Rendered at device pixel ratio
 * (capped at 2; 1 on the "low" quality setting) and scaled back with CSS zoom
 * so the world stays crisp on phones without wasting fill-rate.
 */
export function createGame(parent: HTMLElement, selfId: string): Phaser.Game {
  const low = useSettings.getState().quality === 'low';
  const dpr = low ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, parent.clientWidth);
  const h = Math.max(1, parent.clientHeight);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0e1512',
    scale: { mode: Phaser.Scale.NONE, width: w * dpr, height: h * dpr, zoom: 1 / dpr },
    render: { antialias: true, powerPreference: 'high-performance', pixelArt: false },
    fps: { target: 60, smoothStep: true },
    input: { keyboard: true, touch: true, mouse: true },
    audio: { noAudio: true },
    disableContextMenu: true,
    banner: false,
    callbacks: {
      preBoot: (g) => {
        g.registry.set('dpr', dpr);
        g.registry.set('selfId', selfId);
      },
    },
    scene: [WorldScene],
  });

  const ro = new ResizeObserver(() => {
    const cw = Math.max(1, parent.clientWidth);
    const ch = Math.max(1, parent.clientHeight);
    game.scale.resize(cw * dpr, ch * dpr);
    game.scale.setZoom(1 / dpr);
  });
  ro.observe(parent);
  game.events.once(Phaser.Core.Events.DESTROY, () => ro.disconnect());
  return game;
}
