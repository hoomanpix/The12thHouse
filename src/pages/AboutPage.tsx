import { useState } from 'react';

type CollectiveMember = {
  id: string;
  index: string;
  name: string;
  role: string;
  statement: string;
  about: string;
  focus: string;
};

const members: CollectiveMember[] = [
  {
    id: 'member-01', index: '01', name: '[Name to be added]', role: 'Sound / Music',
    statement: 'The first room: where the house begins to speak.',
    about: 'Shapes the sonic language of The12thHouse through rhythm, atmosphere, voice, and the spaces between them.',
    focus: 'Composition, production, recording',
  },
  {
    id: 'member-02', index: '02', name: '[Name to be added]', role: 'Visual / Motion',
    statement: 'Images that carry the feeling of a place.',
    about: 'Builds the visual worlds and moving forms that give each release, idea, and gathering its own atmosphere.',
    focus: 'Visual identity, image-making, animation',
  },
  {
    id: 'member-03', index: '03', name: '[Name to be added]', role: 'Digital / Web',
    statement: 'A house needs a way to be entered.',
    about: 'Designs the digital spaces through which the collective’s work can be encountered, explored, and remembered.',
    focus: 'Interaction, web design, digital systems',
  },
];

export function AboutPage() {
  const [activeMember, setActiveMember] = useState<string | null>(null);

  const toggleMember = (memberId: string) => {
    setActiveMember((current) => current === memberId ? null : memberId);
  };

  return (
    <div className="page-section about-page editorial-about">
      <header className="about-intro">
        <p className="eyebrow">The12thHouse / collective</p>
        <h1>A house for<br />the unseen.</h1>
        <p className="about-intro__note">The name points to a space beyond the visible: a place for intuition, transition, and the forms that are still taking shape.</p>
      </header>
      <section className="profile-list" aria-label="The12thHouse collective profiles">
        <div className="profile-list__heading">
          <span className="eyebrow">The people inside</span>
          <span className="profile-list__hint">Select a profile</span>
        </div>
        {members.map((member) => {
          const isActive = activeMember === member.id;
          return (
            <article className={`profile-entry${isActive ? ' profile-entry--active' : ''}`} key={member.id}>
              <button
                className="profile-entry__trigger"
                type="button"
                aria-expanded={isActive}
                aria-controls={`${member.id}-details`}
                onClick={() => toggleMember(member.id)}
              >
                <span className="profile-entry__index">{member.index}</span>
                <span className="profile-entry__identity"><span className="eyebrow">{member.role}</span><strong>{member.name}</strong></span>
                <span className="profile-entry__action">{isActive ? 'Close' : 'View profile'} <span aria-hidden="true">{isActive ? '−' : '+'}</span></span>
              </button>
              {isActive && (
                <div className="profile-entry__details" id={`${member.id}-details`}>
                  <div>
                    <p className="profile-entry__statement">{member.statement}</p>
                    <p>{member.about}</p>
                  </div>
                  <div className="profile-entry__focus"><span className="eyebrow">Focus</span><p>{member.focus}</p></div>
                </div>
              )}
            </article>
          );
        })}
      </section>
      <footer className="about-footer"><span>A shared space for what comes next.</span><span>12 → ∞</span></footer>
    </div>
  );
}
