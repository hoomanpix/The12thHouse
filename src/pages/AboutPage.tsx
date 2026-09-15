import { mockArtist } from '../data/mock';

export function AboutPage() {
  return (
    <div className="page-section about-page editorial-about">
      <header className="about-intro"><p className="eyebrow">The12thHouse / profile</p><h1>About the<br />work.</h1><p className="about-intro__note">A quiet practice in sound, space, and after-hours feeling.</p></header>
      <section className="about-layout">
        <div className="about-image"><img src={mockArtist.image_url ?? ''} alt={mockArtist.name} /></div>
        <div className="about-copy"><p className="eyebrow">Statement</p><p>{mockArtist.biography}</p><div className="social-links"><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://x.com" target="_blank" rel="noreferrer">X / Twitter</a><a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a></div></div>
      </section>
      <footer className="about-footer"><span>Based in {mockArtist.location}</span><a href={`mailto:${mockArtist.email}`}>{mockArtist.email}</a></footer>
    </div>
  );
}
