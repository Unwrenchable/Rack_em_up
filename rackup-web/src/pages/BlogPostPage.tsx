import { Link, useParams } from 'react-router-dom';
import { BLOG_POSTS, getBlogPost } from '../lib/content';
import { MarkdownBody } from '../lib/markdown';

export function BlogPostPage() {
  const { slug = '' } = useParams();
  const post = getBlogPost(slug);

  if (!post) {
    return (
      <div className="page marketing-page stack" style={{ gap: 14 }}>
        <p className="eyebrow">Blog</p>
        <h1 className="h1" style={{ fontSize: '2.4rem' }}>
          Post not found
        </h1>
        <p className="muted">That guide is not on the RackUp blog.</p>
        <Link to="/blog" className="btn btn-secondary">
          All guides
        </Link>
      </div>
    );
  }

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article className="page marketing-page stack" style={{ gap: 18 }}>
      <p className="eyebrow">
        <Link to="/blog" className="prose-a">
          Blog
        </Link>
      </p>
      <MarkdownBody source={post.body} />
      {related.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <div className="section-title">
            <h2>More from the blog</h2>
          </div>
          {related.map((item) => (
            <Link key={item.slug} to={item.path} className="card card-link">
              <h3 className="h2">{item.title}</h3>
              <p className="muted" style={{ marginTop: 6, fontSize: '0.88rem' }}>
                {item.metaDescription}
              </p>
            </Link>
          ))}
        </section>
      )}
    </article>
  );
}
