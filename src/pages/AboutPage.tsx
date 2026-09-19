import { mockArtist } from '../data/mock';

export function AboutPage() {
  return (
    <div className="page-section about-page">
      <div className="about-layout">
        <div className="about-image">
          <img src={mockArtist.image_url ?? ''} alt={mockArtist.name} />
        </div>

        <div className="about-copy">
          <p className="eyebrow">About</p>
          <h1>{mockArtist.name}</h1>
          <p>{mockArtist.biography}</p>

          <div className="social-links">
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer">
              X / Twitter
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer">
              YouTube
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
