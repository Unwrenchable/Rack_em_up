import { Link } from 'react-router-dom';
import { ABOUT } from '../lib/content';
import { MarkdownBody } from '../lib/markdown';

export function AboutPage() {
  return (
    <article className="page marketing-page stack" style={{ gap: 18 }}>
      <p className="eyebrow">Rack of Champions</p>
      <MarkdownBody source={ABOUT.body} />
      <Link to="/auth" className="btn btn-primary btn-block">
        Join RackUp
      </Link>
    </article>
  );
}
