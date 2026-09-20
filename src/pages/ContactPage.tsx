import { siteConfig } from '../config/site';

export function ContactPage() {
  return (
    <div className="page-section contact-page">
      <section className="contact-intro" aria-labelledby="contact-title">
        <p className="eyebrow">Contact</p>
        <h1 id="contact-title">Start a conversation with the studio.</h1>
        <p className="lede">For collaborations, commissions, and project enquiries, contact the appropriate studio member below.</p>
      </section>

      <section className="contact-directory" aria-label="A 071 Studio contact members">
        <div className="contact-list">
          {siteConfig.contactMembers.map((member) => (
            <article className="contact-member" key={member.id}>
              <span className="contact-member__number">{member.number}</span>
              <div className="contact-member__identity">
                <h2>{member.name}</h2>
                <a href={`mailto:${member.email}`} aria-label={`Email ${member.name}`}>
                  {member.email}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
