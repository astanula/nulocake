/**
 * Cake flavour compositions shown on /oferta.
 * Single source of truth for the flavour selector and the cake cross-section.
 */

export type SpongeId = 'klasyczny' | 'czekoladowy' | 'orzechowy';

/** Visual treatment of an addition inside a cream layer. */
export type AdditionKind = 'crunch' | 'fruit' | 'caramel' | 'caramel-nuts';

export interface CakeAddition {
  label: string;
  kind: AdditionKind;
  color: string;
}

export interface CakeCream {
  name: string;
  color: string;
  addition?: CakeAddition;
}

export interface CakeFlavor {
  id: string;
  name: string;
  sponge: SpongeId;
  creams: readonly [CakeCream, CakeCream];
}

export interface CakeLayer {
  kind: 'sponge' | 'cream';
  name: string;
  color: string;
  heightCm: number;
  addition?: CakeAddition;
}

export const CAKE_SPONGES: Record<SpongeId, { name: string; color: string }> = {
  klasyczny: { name: 'Biszkopt klasyczny', color: '#d7af78' },
  czekoladowy: { name: 'Biszkopt czekoladowy', color: '#62402f' },
  orzechowy: { name: 'Biszkopt orzechowy', color: '#aa7e50' },
};

export const SPONGE_HEIGHT_CM = 2;
export const CREAM_HEIGHT_CM = 4;

export const CAKE_FLAVORS: readonly CakeFlavor[] = [
  {
    id: 'malinowe-rafaello',
    name: 'Malinowe rafaello',
    sponge: 'klasyczny',
    creams: [
      { name: 'Krem rafaello', color: '#f2e5c9', addition: { label: 'Chrupka migdałowo-kokosowa', kind: 'crunch', color: '#a97846' } },
      { name: 'Krem rafaello', color: '#f2e5c9', addition: { label: 'Frużelina malinowa', kind: 'fruit', color: '#ad3654' } },
    ],
  },
  {
    id: 'orzech-karmel-czekolada',
    name: 'Orzech-karmel-czekolada',
    sponge: 'czekoladowy',
    creams: [
      { name: 'Krem orzech ziemny', color: '#cfa777', addition: { label: 'Chrupka orzechowa', kind: 'crunch', color: '#916131' } },
      { name: 'Krem czekoladowy', color: '#79503e', addition: { label: 'Solony karmel', kind: 'caramel', color: '#d69a44' } },
    ],
  },
  {
    id: 'pistacja-malina',
    name: 'Pistacja-malina',
    sponge: 'klasyczny',
    creams: [
      { name: 'Krem pistacjowy', color: '#b3bf87', addition: { label: 'Chrupka pistacjowa', kind: 'crunch', color: '#60723a' } },
      { name: 'Krem malinowy', color: '#d78c9c', addition: { label: 'Żelka malinowa', kind: 'fruit', color: '#a93253' } },
    ],
  },
  {
    id: 'czekolada-american-cheesecake',
    name: 'Czekolada-american cheesecake',
    sponge: 'czekoladowy',
    creams: [
      { name: 'Krem czekoladowy', color: '#89614a', addition: { label: 'Chrupka czekoladowa', kind: 'crunch', color: '#442c24' } },
      { name: 'Krem american cheesecake', color: '#f0e1c9', addition: { label: 'Frużelina z wiśni', kind: 'fruit', color: '#883748' } },
    ],
  },
  {
    id: 'malina-smietanka',
    name: 'Malina-śmietanka',
    sponge: 'klasyczny',
    creams: [
      { name: 'Krem śmietankowy', color: '#f4e9d7', addition: { label: 'Żelka lub frużelina malinowa', kind: 'fruit', color: '#ae3b59' } },
      { name: 'Krem malinowy', color: '#d78c9c' },
    ],
  },
  {
    id: 'solony-karmel-owoce-lesne',
    name: 'Solony karmel-owoce leśne',
    sponge: 'klasyczny',
    creams: [
      { name: 'Krem solony karmel', color: '#c79860', addition: { label: 'Płynny karmel i orzeszki', kind: 'caramel-nuts', color: '#905421' } },
      { name: 'Krem owoce leśne', color: '#a981a6', addition: { label: 'Żelka owoce leśne', kind: 'fruit', color: '#6b365f' } },
    ],
  },
  {
    id: 'biala-czekolada-mango-marakuja',
    name: 'Biała czekolada-mango-marakuja',
    sponge: 'klasyczny',
    creams: [
      { name: 'Krem biała czekolada z wanilią', color: '#f1e3c6', addition: { label: 'Chrupka z białej czekolady', kind: 'crunch', color: '#c8ad76' } },
      { name: 'Krem biała czekolada z wanilią', color: '#f1e3c6', addition: { label: 'Żelka lub frużelina mango-marakuja', kind: 'fruit', color: '#e5a136' } },
    ],
  },
  {
    id: 'kinder-bueno-truskawka',
    name: 'Kinder bueno-truskawka',
    sponge: 'orzechowy',
    creams: [
      { name: 'Krem kinder bueno', color: '#d2b490', addition: { label: 'Chrupka orzechowa', kind: 'crunch', color: '#8d6035' } },
      { name: 'Krem kinder bueno', color: '#d2b490', addition: { label: 'Żelka truskawkowa', kind: 'fruit', color: '#ba4c58' } },
    ],
  },
];

/** Five layers from the top: sponge, cream, sponge, cream, sponge (heights 1 : 2 : 1 : 2 : 1). */
export function cakeLayers(flavor: CakeFlavor): CakeLayer[] {
  const sponge = CAKE_SPONGES[flavor.sponge];
  const spongeLayer: CakeLayer = { kind: 'sponge', name: sponge.name, color: sponge.color, heightCm: SPONGE_HEIGHT_CM };
  const creamLayer = ({ name, color, addition }: CakeCream): CakeLayer => ({ kind: 'cream', name, color, addition, heightCm: CREAM_HEIGHT_CM });
  const [first, second] = flavor.creams;
  return [spongeLayer, creamLayer(first), spongeLayer, creamLayer(second), spongeLayer];
}
