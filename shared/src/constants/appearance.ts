/**
 * Character appearance palettes. Appearance is stored as small indices so it is
 * cheap to send and trivially validated. Cats use exactly the same system.
 */
export const BODY_TYPES = ['boy', 'girl'] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const SKIN_TONES = [0xf1c9a5, 0xd9a47a, 0xb97f55, 0x8d5a3b, 0x6b4029] as const;

export const HAIR_COLORS = [0x1b1511, 0x3a2618, 0x5c3b22, 0x7a5a3a, 0x2b2b33] as const;

/** Boy: 0 short, 1 side-part, 2 curly, 3 buzz. Girl: 0 long braid, 1 bob, 2 bun, 3 ponytail. */
export const HAIR_STYLE_COUNT = 4;

export const CLOTH_COLORS = [
  0x2f6b4f, // areca green
  0xc9772b, // turmeric
  0x3f5f8a, // monsoon blue
  0xa23b3b, // laterite red
  0xe8e1cf, // mundu white
  0x6b4e8a, // kadali violet
  0x2c2c2c, // charcoal
  0xd8b640, // kasavu gold
  0x5a8f9c, // canal teal
  0x8a6a4a, // coir brown
] as const;

export const TOP_STYLES = ['shirt', 'tshirt', 'raincoat'] as const;
export type TopStyle = (typeof TOP_STYLES)[number];

export const FOOTWEAR = ['sandals', 'shoes'] as const;
export type Footwear = (typeof FOOTWEAR)[number];

export const ACCESSORIES = ['none', 'glasses', 'cap', 'backpack', 'umbrella'] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export interface Appearance {
  body: BodyType;
  skin: number;
  hair: number;
  hairColor: number;
  top: number;
  topStyle: TopStyle;
  bottom: number;
  footwear: Footwear;
  accessory: Accessory;
}

export const DEFAULT_APPEARANCE: Appearance = {
  body: 'boy',
  skin: 1,
  hair: 0,
  hairColor: 0,
  top: 0,
  topStyle: 'shirt',
  bottom: 4,
  footwear: 'sandals',
  accessory: 'none',
};

export function randomAppearance(rand: () => number = Math.random): Appearance {
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)] as T;
  const idx = (n: number) => Math.floor(rand() * n);
  return {
    body: pick(BODY_TYPES),
    skin: idx(SKIN_TONES.length),
    hair: idx(HAIR_STYLE_COUNT),
    hairColor: idx(HAIR_COLORS.length),
    top: idx(CLOTH_COLORS.length),
    topStyle: pick(TOP_STYLES),
    bottom: idx(CLOTH_COLORS.length),
    footwear: pick(FOOTWEAR),
    accessory: pick(ACCESSORIES),
  };
}
