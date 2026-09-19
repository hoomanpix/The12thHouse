import { useState } from 'react';

type Member = {
  id: string;
  number: string;
  role: string;
  name: string;
  about: string;
  socials: Array<{ label: string; href: string }>;
};

const members: Member[] = [
  {
    id: 'member-01',
    number: '01',
    role: 'Musician / Producer',
    name: 'Member 01 — Placeholder',
    about: 'A placeholder profile for the musician and producer of The12thHouse. Replace this text with the member’s short biography, practice, and role in the collective.',
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
    about: 'A placeholder profile for the designer and animator of The12thHouse. Replace this text with the member’s short biography, visual language, and contribution to the collective.',
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
    about: 'A placeholder profile for the web and app developer of The12thHouse. Replace this text with the member’s short biography, technical practice, and contribution to the platform.',
    socials: [
      { label: 'X — placeholder', href: 'https://x.com/your-handle' },
      { label: 'Instagram — placeholder', href: 'https://instagram.com/your-handle' },
      { label: 'GitHub — placeholder', href: 'https://github.com/your-handle' },
    ],
  },
];

export function AboutPage() {
  const [activeMemberId, setActiveMemberId] = useState(members[0].id);
  const activeMember = members.find((member) => member.id === activeMemberId) ?? members[0];

  return (
    <div className="page-section about-page">
      <section className="about-intro" aria-labelledby="about-title">
        <p className="eyebrow">About The12thHouse</p>
        <h1 id="about-title">The twelfth room is where separate practices become one house.</h1>
        <p className="about-philosophy">
          The12thHouse takes its name from the twelve notes, twelve seasons, and the recurring structures that make a whole from distinct parts. It is a virtual gallery and creative platform for music, image, motion, and code — a shared space where three disciplines meet without losing their individual voices.
        </p>
      </section>

      <section className="member-directory" aria-label="The12thHouse members">
        <div className="member-list" role="tablist" aria-label="Select a member">
          {members.map((member) => {
            const isActive = member.id === activeMember.id;
            return (
              <button
                key={member.id}
                type="button"
                className={`member-tab${isActive ? ' is-active' : ''}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${member.id}`}
                onClick={() => setActiveMemberId(member.id)}
              >
                <span className="member-tab__number">{member.number}</span>
                <span className="member-tab__name">{member.name}</span>
                <span className="member-tab__role">{member.role}</span>
              </button>
            );
          })}
        </div>

        <article
          id={`panel-${activeMember.id}`}
          className="member-detail"
          role="tabpanel"
          aria-label={`${activeMember.name} profile`}
        >
          <p className="eyebrow">{activeMember.role}</p>
          <h2>{activeMember.name}</h2>
          <p>{activeMember.about}</p>
          <div className="member-social-links" aria-label={`${activeMember.name} social links`}>
            {activeMember.socials.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noreferrer">
                {social.label}
              </a>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
