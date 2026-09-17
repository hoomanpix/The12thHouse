type HouseTheme = {
  id: string;
  label: string;
  title: string;
  statement: string;
  about: string;
};

const houseThemes: HouseTheme[] = [
  {
    id: 'unseen', label: '01 / The unseen', title: 'A room for what is still becoming.',
    statement: 'The twelfth house belongs to the quiet spaces.',
    about: 'It is a symbol of the unseen: intuition, memory, dreams, and the ideas that take shape before they have a name.',
  },
  {
    id: 'threshold', label: '02 / The threshold', title: 'Between one state and another.',
    statement: 'The house is a threshold, not a destination.',
    about: 'It holds the pause between endings and beginnings—a place to look inward, dissolve old forms, and make room for a different way of seeing.',
  },
  {
    id: 'collective', label: '03 / The collective', title: 'Many perspectives, one shared space.',
    statement: 'The12thHouse is open by design.',
    about: 'The name describes the space we are building: a house for different voices, practices, and sensibilities to meet without losing their individuality.',
  },
];

export function AboutPage() {
  return (
    <div className="page-section about-page editorial-about">
      <header className="about-intro">
        <p className="eyebrow">The12thHouse / meaning</p>
        <h1>A house for<br />the unseen.</h1>
        <p className="about-intro__note">The name points to a space beyond the visible: a place for intuition, transition, and the forms that are still taking shape.</p>
      </header>
      <section className="member-list" aria-label="The meaning of The12thHouse">
        {houseThemes.map((theme) => (
          <article className="member-entry" key={theme.id}>
            <div className="member-entry__index">{theme.label.split(' / ')[0]}</div>
            <div className="member-entry__identity"><p className="eyebrow">{theme.label.split(' / ')[1]}</p><h2>{theme.title}</h2></div>
            <div className="member-entry__copy"><p className="member-entry__statement">{theme.statement}</p><p>{theme.about}</p></div>
          </article>
        ))}
      </section>
      <footer className="about-footer"><span>A shared space for what comes next.</span><span>12 → ∞</span></footer>
    </div>
  );
}
