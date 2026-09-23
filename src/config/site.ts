export const siteConfig = {
  brand: 'A 071 Studio',
  brandLines: ['A 071', 'Studio'],
  heroEyebrow: 'WELCOME TO',
  introName: 'The12thHouse',
  contactMembers: [
    { id: 'contact-01', number: '01', name: 'Member 01 — [NAME]', email: '[EMAIL]' },
    { id: 'contact-02', number: '02', name: 'Member 02 — [NAME]', email: '[EMAIL]' },
    { id: 'contact-03', number: '03', name: 'Member 03 — [NAME]', email: '[EMAIL]' },
    { id: 'contact-04', number: '04', name: 'Member 04 — [NAME]', email: '[EMAIL]' },
  ],
} as const;

export const aboutMembers = [
  {
    id: 'member-01',
    number: '01',
    role: 'Musician / Producer',
    name: 'Member 01 — Placeholder',
    about: 'Editable placeholder biography for the musician and producer. Replace this text with the member’s short biography, practice, and role in the studio.',
    socials: [
      { label: 'X — placeholder', href: 'https://x.com/your-handle' },
      { label: 'Instagram — placeholder', href: 'https://instagram.com/your-handle' },
    ],
  },
  {
    id: 'member-02',
    number: '02',
    role: 'Designer / Animator',
    name: 'Member 02 — Placeholder',
    about: 'Editable placeholder biography for the designer and animator. Replace this text with the member’s visual practice and contribution to the studio.',
    socials: [
      { label: 'X — placeholder', href: 'https://x.com/your-handle' },
      { label: 'Instagram — placeholder', href: 'https://instagram.com/your-handle' },
      { label: 'Pinterest — placeholder', href: 'https://pinterest.com/your-handle' },
    ],
  },
  {
    id: 'member-03',
    number: '03',
    role: 'Web / App Developer',
    name: 'Member 03 — Placeholder',
    about: 'Editable placeholder biography for the web and app developer. Replace this text with the member’s technical practice and contribution to the platform.',
    socials: [
      { label: 'X — placeholder', href: 'https://x.com/your-handle' },
      { label: 'Instagram — placeholder', href: 'https://instagram.com/your-handle' },
      { label: 'GitHub — placeholder', href: 'https://github.com/your-handle' },
    ],
  },
  {
    id: 'member-04',
    number: '04',
    role: 'DESIGNER / ANIMATOR',
    name: 'Member 04 — Placeholder',
    about: 'Editable placeholder biography for the fourth studio member. Replace this text with the designer / animator’s biography and practice.',
    socials: [
      { label: 'Instagram — placeholder', href: 'https://instagram.com/your-handle' },
    ],
  },
] as const;
