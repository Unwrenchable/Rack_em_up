import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '../lib/content';

export function BlogIndexPage() {
  return (
    <div className="page marketing-page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Guides</p>
        <h1 className="h1" style={{ fontSize: '2.6rem', marginTop: 4 }}>
          RackUp blog
        </h1>
        <p className="muted" style={{ marginTop: 10, maxWidth: 520 }}>
          How the Rack of Champions player network works — finding games, hall
          check-in, money sets, tournaments, and practice. Not a scorekeeping
          app that shares the RackUp name.
        </p>
      </header>

      <div className="stack" style={{ gap: 12 }}>
        {BLOG_POSTS.map((post) => (
          <Link key={post.slug} to={post.path} className="card card-link blog-card">
            <p className="eyebrow">Guide</p>
            <h2 className="h2" style={{ marginTop: 6 }}>
              {post.title}
            </h2>
            <p className="muted" style={{ marginTop: 8 }}>
              {post.metaDescription}
            </p>
            <span className="blog-card-cta">Read</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
