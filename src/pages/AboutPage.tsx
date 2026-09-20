import { useState } from 'react';
import { aboutMembers } from '../config/site';

type Member = (typeof aboutMembers)[number];

export function AboutPage() {
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  return (
    <div className="page-section about-page">
      <section className="about-intro" aria-labelledby="about-title">
        <p className="eyebrow">About The12thHouse</p>
        <h1 id="about-title">Separate practices become one shared studio.</h1>
        <p className="about-philosophy">
          The12thHouse is a creative platform for music, image, motion, and code — a shared space where distinct disciplines meet without losing their individual voices.
        </p>
      </section>

      <section className="member-directory" aria-label="The12thHouse members">
        <div className="member-list">
          {aboutMembers.map((member: Member) => {
            const isActive = member.id === activeMemberId;
            return (
              <div className={`member-item${isActive ? ' is-open' : ''}`} key={member.id}>
                <button
                  type="button"
                  className={`member-tab${isActive ? ' is-active' : ''}`}
                  aria-expanded={isActive}
                  aria-controls={`panel-${member.id}`}
                  onClick={() => setActiveMemberId(isActive ? null : member.id)}
                >
                  <span className="member-tab__number">{member.number}</span>
                  <span className="member-tab__name">{member.name}</span>
                  <span className="member-tab__role">{member.role}</span>
                  <span className="member-tab__indicator" aria-hidden="true">{isActive ? '−' : '+'}</span>
                </button>

                <div id={`panel-${member.id}`} className={`member-detail${isActive ? ' is-open' : ''}`} aria-hidden={!isActive} aria-label={`${member.name} profile`}>
                  <p className="eyebrow">{member.role}</p>
                  <h2>{member.name}</h2>
                  <p>{member.about}</p>
                  <div className="member-social-links" aria-label={`${member.name} social links`}>
                      {member.socials.map((social) => (
                      <a key={social.label} href={social.href} target="_blank" rel="noreferrer" tabIndex={isActive ? 0 : -1}>
                        {social.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
