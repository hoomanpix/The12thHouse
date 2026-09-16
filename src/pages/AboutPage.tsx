type CollectiveMember = {
  id: string;
  name: string;
  role: string;
  statement: string;
  about: string;
  links: Array<{ label: string; url: string }>;
};

const members: CollectiveMember[] = [
  {
    id: 'musician-producer', name: '[Name to be added]', role: 'Musician / Producer',
    statement: 'Sound as a place to enter.',
    about: 'Creates the musical language of The12thHouse: rhythm, atmosphere, voice, and the spaces between them.',
    links: [],
  },
  {
    id: 'visual-artist', name: '[Name to be added]', role: 'Designer / Visual Artist / Animator',
    statement: 'Images that move like memory.',
    about: 'Builds the visual worlds, motion studies, and visual identities that give each release its own room.',
    links: [],
  },
  {
    id: 'web-developer', name: '[Name to be added]', role: 'Web & Application Designer / Developer',
    statement: 'Interfaces as exhibition space.',
    about: 'Designs and develops the digital architecture through which the collective’s work can be encountered.',
    links: [],
  },
];

export function AboutPage() {
  return (
    <div className="page-section about-page editorial-about">
      <header className="about-intro">
        <p className="eyebrow">The12thHouse / collective</p>
        <h1>Three practices.<br />One house.</h1>
        <p className="about-intro__note">A virtual gallery for sound, image, motion, and code—structured around cycles, harmony, and the twelve.</p>
      </header>
      <section className="member-list" aria-label="The12thHouse collective members">
        {members.map((member, index) => (
          <article className="member-entry" key={member.id}>
            <div className="member-entry__index">0{index + 1}</div>
            <div className="member-entry__identity"><p className="eyebrow">{member.role}</p><h2>{member.name}</h2></div>
            <div className="member-entry__copy"><p className="member-entry__statement">{member.statement}</p><p>{member.about}</p>{member.links.length > 0 && <nav className="social-links" aria-label={`${member.name} links`}>{member.links.map((link) => <a key={link.label} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</nav>}</div>
          </article>
        ))}
      </section>
      <footer className="about-footer"><span>Sound / Image / Code</span><span>12 → ∞</span></footer>
    </div>
  );
}
