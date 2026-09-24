import type { Appearance } from '@nizhal/shared';
import type { I18nKey } from '@/utils/i18n';

/**
 * The five Kadalimukku neighbours from the story intro. The tutorial reuses
 * them so the player meets the same faces in the town.
 */
export interface CastMember {
  id: CastId;
  nameKey: I18nKey;
  whoKey: I18nKey;
  appearance: Appearance;
}

export const CAST_IDS = ['ammu', 'rahul', 'fathima', 'joseph', 'meera'] as const;
export type CastId = (typeof CAST_IDS)[number];

export const CAST: Record<CastId, CastMember> = {
  ammu: {
    id: 'ammu',
    nameKey: 'npc.ammu',
    whoKey: 'intro.who.ammu',
    appearance: { body: 'girl', skin: 2, hair: 0, hairColor: 0, top: 2, topStyle: 'tshirt', bottom: 6, footwear: 'sandals', accessory: 'backpack' },
  },
  rahul: {
    id: 'rahul',
    nameKey: 'npc.rahul',
    whoKey: 'intro.who.rahul',
    appearance: { body: 'boy', skin: 3, hair: 1, hairColor: 0, top: 9, topStyle: 'shirt', bottom: 4, footwear: 'sandals', accessory: 'none' },
  },
  fathima: {
    id: 'fathima',
    nameKey: 'npc.fathima',
    whoKey: 'intro.who.fathima',
    appearance: { body: 'girl', skin: 1, hair: 2, hairColor: 1, top: 3, topStyle: 'raincoat', bottom: 7, footwear: 'sandals', accessory: 'umbrella' },
  },
  joseph: {
    id: 'joseph',
    nameKey: 'npc.joseph',
    whoKey: 'intro.who.joseph',
    appearance: { body: 'boy', skin: 2, hair: 3, hairColor: 4, top: 1, topStyle: 'raincoat', bottom: 6, footwear: 'shoes', accessory: 'cap' },
  },
  meera: {
    id: 'meera',
    nameKey: 'npc.meera',
    whoKey: 'intro.who.meera',
    appearance: { body: 'girl', skin: 0, hair: 1, hairColor: 2, top: 5, topStyle: 'shirt', bottom: 4, footwear: 'shoes', accessory: 'glasses' },
  },
};
