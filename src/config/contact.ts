export const MESSAGE_FALLBACK = 'Chcę zapytać o tort.';

export const MAX_CREAM_FLAVORS = 3;

export const CREAM_FLAVORS = [
  'Wanilia z mascarpone',
  'Belgijska czekolada',
  'Słony karmel',
  'Malina',
  'Pistacja',
  'Owoce leśne',
  'Kawa',
  'Cytryna',
] as const;

export type ContactChannelId = 'messenger' | 'whatsapp' | 'instagram' | 'telegram';

export interface ContactChannel {
  id: ContactChannelId;
  label: string;
  recipient?: string;
}

export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  { id: 'messenger', label: 'Messenger' },
  { id: 'whatsapp', label: 'WhatsApp', recipient: '48500268600' },
  { id: 'instagram', label: 'Instagram', recipient: 'nulo.cake' },
  { id: 'telegram', label: 'Telegram' },
];
