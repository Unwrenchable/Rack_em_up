import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

const SITE_URL = /https?:\/\/(?:www\.)?rackofchampions\.com[^\s<]*/gi;

function spaPath(href: string): string | null {
  const trimmed = href.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/api')) {
    return trimmed;
  }
  const m = trimmed.match(/^https?:\/\/(?:www\.)?rackofchampions\.com(\/[^?\s#]*)?/i);
  if (!m) return null;
  const path = m[1] || '/';
  return path.replace(/\/+$/, '') || '/';
}

function hrefLink(href: string, label: string, key: number): ReactNode {
  const path = spaPath(href);
  if (path) {
    return (
      <Link key={key} to={path} className="prose-a">
        {label}
      </Link>
    );
  }
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      key={key}
      href={href}
      className="prose-a"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </a>
  );
}

function autolinkText(text: string, keyRef: { n: number }): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(SITE_URL.source, 'gi');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    let url = m[0];
    let trailing = '';
    while (/[.,;:!?]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    nodes.push(hrefLink(url, url, keyRef.n++));
    if (trailing) nodes.push(trailing);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(!?\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;
  let last = 0;
  const keyRef = { n: 0 };
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      nodes.push(...autolinkText(text.slice(last, m.index), keyRef));
    }
    if (m[1]) {
      const label = m[2];
      const href = m[3];
      if (m[1].startsWith('!')) {
        nodes.push(
          <img key={keyRef.n++} src={href} alt={label} className="prose-img" />,
        );
      } else {
        nodes.push(hrefLink(href, label, keyRef.n++));
      }
    } else if (m[4]) {
      nodes.push(<strong key={keyRef.n++}>{renderInline(m[5])}</strong>);
    } else if (m[6]) {
      nodes.push(
        <code key={keyRef.n++} className="prose-code">
          {m[7]}
        </code>,
      );
    } else if (m[8]) {
      nodes.push(<em key={keyRef.n++}>{renderInline(m[9])}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(...autolinkText(text.slice(last), keyRef));
  return nodes;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

function isFence(row: string[]): boolean {
  return row.length > 0 && row.every((c) => /^:?-{3,}:?$/.test(c));
}

export function MarkdownBody({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <pre key={k++} className="prose-pre">
          <code>{buf.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3') as 'h1' | 'h2' | 'h3';
      blocks.push(
        <Tag key={k++} className={`prose-h${level}`}>
          {renderInline(heading[2])}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={k++} className="prose-hr" />);
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const bodyRows = rows.filter((r) => !isFence(r));
      if (bodyRows.length) {
        const [header, ...rest] = bodyRows;
        blocks.push(
          <div key={k++} className="prose-table-wrap">
            <table className="prose-table">
              <thead>
                <tr>
                  {header.map((cell, ci) => (
                    <th key={ci}>{renderInline(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rest.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={k++} className="prose-ul">
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol key={k++} className="prose-ol">
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        buf.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(
        <blockquote key={k++} className="prose-quote">
          {renderInline(buf.join(' '))}
        </blockquote>,
      );
      continue;
    }

    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !/^---+$/.test(lines[i].trim())
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={k++} className="prose-p">
        {renderInline(buf.join(' '))}
      </p>,
    );
  }

  return <div className="prose">{blocks}</div>;
}

export function MarkdownInline({ text }: { text: string }) {
  return <Fragment>{renderInline(text)}</Fragment>;
}
