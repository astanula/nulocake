import { MESSAGE_FALLBACK, type ContactChannel, type ContactChannelId } from '../config/contact';

export interface EnquiryContent {
  message: string;
  date: string;
  people: string;
  flavors: readonly string[];
}

export interface EnquiryDraft extends EnquiryContent {
  email: string;
  images: readonly File[];
}

export interface EmailSubmitDetail {
  draft: EnquiryDraft;
  text: string;
}

export const EMAIL_SUBMIT_EVENT = 'contact:email-submit';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) => EMAIL_PATTERN.test(email.trim());

export const effectiveMessage = (message: string) => message.trim() || MESSAGE_FALLBACK;

const formatDate = (isoDate: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
};

const formatPeople = (people: string) => {
  const count = Number(people);
  return people.trim() && Number.isInteger(count) && count > 0 ? String(count) : '';
};

const enquiryDetails = ({ date, people, flavors }: EnquiryContent) =>
  [
    ['Termin', formatDate(date)],
    ['Liczba osób', formatPeople(people)],
    ['Smaki kremów', flavors.join(', ')],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

export function formatEnquiryText(content: EnquiryContent): string {
  const details = enquiryDetails(content);
  const message = effectiveMessage(content.message);
  return details.length ? `${message}\n\n${details.join('\n')}` : message;
}

export const hasCustomContent = (content: EnquiryContent) =>
  Boolean(content.message.trim()) || enquiryDetails(content).length > 0;

interface ChannelHandoff {
  prefill: boolean;
  buildUrl: (recipient: string, text: string) => string;
}

const CHANNEL_HANDOFFS: Record<ContactChannelId, ChannelHandoff> = {
  messenger: {
    prefill: true,
    buildUrl: (recipient, text) => `https://m.me/${encodeURIComponent(recipient)}?text=${encodeURIComponent(text)}`,
  },
  whatsapp: {
    prefill: true,
    buildUrl: (recipient, text) => `https://wa.me/${encodeURIComponent(recipient)}?text=${encodeURIComponent(text)}`,
  },
  instagram: {
    prefill: false,
    buildUrl: (recipient) => `https://ig.me/m/${encodeURIComponent(recipient)}`,
  },
  telegram: {
    prefill: true,
    buildUrl: (recipient, text) => `https://t.me/${encodeURIComponent(recipient)}?text=${encodeURIComponent(text)}`,
  },
};

export const channelSupportsPrefill = (id: ContactChannelId) => CHANNEL_HANDOFFS[id].prefill;

export const channelUrl = (channel: ContactChannel, text: string) =>
  channel.recipient ? CHANNEL_HANDOFFS[channel.id].buildUrl(channel.recipient, text) : null;
