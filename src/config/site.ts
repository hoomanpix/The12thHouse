export type ContactMember = { id: string; number?: string; name: string; email: string };
export type AboutMember = { id: string; number?: string; role: string; name: string; about: string; socials: Array<{ label: string; href: string }> };
export const siteConfig = {
  brand: 'A 071 Studio',
  brandLines: ['A 071', 'Studio'],
  heroEyebrow: 'WELCOME TO',
  introName: 'The12thHouse',
  contactMembers: [] as ContactMember[],
} as const;
export const aboutMembers: AboutMember[] = [];
