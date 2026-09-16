import { Link } from 'react-router-dom';
import { FAQ, FAQ_ITEMS, firstParagraph, splitTitle } from '../lib/content';
import { MarkdownBody } from '../lib/markdown';

export function FaqPage() {
  const { title } = splitTitle(FAQ.body);
  const intro = firstParagraph(FAQ.body);

  return (
    <article className="page marketing-page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Help</p>
        <h1 className="h1" style={{ fontSize: '2.6rem', marginTop: 4 }}>
          {title}
        </h1>
        {intro && (
          <p className="muted" style={{ marginTop: 10, maxWidth: 520 }}>
            {intro}
          </p>
        )}
      </header>

      <div className="stack" style={{ gap: 10 }}>
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="faq-item">
            <summary className="faq-q">{item.question}</summary>
            <div className="faq-a">
              <MarkdownBody source={item.answerMarkdown} />
            </div>
          </details>
        ))}
      </div>

      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Still looking? Read <Link to="/about">About</Link> or the{' '}
        <Link to="/blog">blog</Link>.
      </p>
    </article>
  );
}
