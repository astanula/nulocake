export const MESSAGE_FALLBACK = 'Chcę zapytać o tort.';

export const CONTACT_DETAILS = {
  phone: '+48 500 268 600',
  email: 'kontakt@nulocake.pl',
  address: '32-445 Krzyszkowice 756',
} as const;

const mapDestination = encodeURIComponent(`${CONTACT_DETAILS.address}, Polska`);

export const CONTACT_LINKS = {
  phone: `tel:${CONTACT_DETAILS.phone.replace(/\s/g, '')}`,
  email: `mailto:${CONTACT_DETAILS.email}`,
  mapEmbed: `https://maps.google.com/maps?q=${mapDestination}&z=15&output=embed`,
  directions: `https://www.google.com/maps/dir/?api=1&destination=${mapDestination}`,
} as const;

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
  { id: 'messenger', label: 'Messenger', recipient: '61583364552840' },
  { id: 'whatsapp', label: 'WhatsApp', recipient: '48500268600' },
  { id: 'instagram', label: 'Instagram', recipient: 'nulo.cake' },
  { id: 'telegram', label: 'Telegram' },
];
