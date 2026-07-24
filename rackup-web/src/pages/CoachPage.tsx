import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  analyzeShot,
  completeSotd,
  fetchProviderHealth,
  fetchShotOfTheDay,
  fetchSotdStreak,
  fetchTodayDrills,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import type { Drill, ShotOfTheDay } from '../lib/types';
import { Modal } from '../components/Modal';
import { ShotCard } from '../components/ShotCard';

export function CoachPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [drills, setDrills] = useState<Drill[]>([]);
  const [provider, setProvider] = useState('…');
  const [sotd, setSotd] = useState<ShotOfTheDay | null>(null);
  const [realai, setRealai] = useState<{ reachable: boolean; model: string } | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [streak, setStreak] = useState(0);
  const [madeIt, setMadeIt] = useState(false);

  useEffect(() => {
    fetchTodayDrills().then((r) => {
      setDrills(r.drills);
      setProvider(r.provider);
    });
    fetchShotOfTheDay().then(setSotd);
    fetchProviderHealth().then((p) =>
      setRealai({ reachable: p.reachable, model: p.model }),
    );
    fetchSotdStreak().then((s) => setStreak(s.streak));
  }, []);

  const today = drills[0];

  async function runAnalyze() {
    setBusy(true);
    try {
      const res = await analyzeShot({
        notes: notes || undefined,
        videoUrl: videoUrl || undefined,
        game: '9-ball',
        focus: 'stroke',
      });
      setAnalysis(res.analysis);
      push(
        res.offlineFallback || res.provider === 'demo'
          ? 'Offline coach tips (RealAI later)'
          : 'RealAI analysis ready',
        'ok',
      );
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Analyze failed', 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Training · RealAI · SOTD</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Coach
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Rating {user?.rating ?? '—'} · drills via{' '}
          <strong style={{ color: 'var(--gold)' }}>{provider}</strong>
        </p>
      </header>

      {sotd && (
        <>
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span className="chip chip-gold">SOTD streak · {streak} day{streak === 1 ? '' : 's'}</span>
            <Link to="/shots" className="btn btn-ghost btn-sm">
              Browse catalog
            </Link>
          </div>
          <ShotCard
            shot={sotd.shot}
            meta={{
              date: sotd.date,
              daysUntilRepeat: sotd.daysUntilRepeat,
              cycleLength: sotd.cycleLength,
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={madeIt}
            onClick={async () => {
              try {
                const res = await completeSotd(sotd.shot.id);
                setStreak(res.streak);
                setMadeIt(true);
                push(`Logged — streak ${res.streak}`, 'ok');
              } catch (e) {
                push(e instanceof Error ? e.message.slice(0, 100) : 'Could not log shot', 'err');
              }
            }}
          >
            {madeIt ? 'Made it ✓' : 'I made it'}
          </button>
        </>
      )}

      <div className="card">
        <div className="row-between">
          <div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              RealAI provider
            </div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>
              {realai == null
                ? 'Checking…'
                : realai.reachable
                  ? `Online · ${realai.model}`
                  : 'Offline · rules fallback'}
            </div>
          </div>
          <span className={`chip${realai?.reachable ? ' chip-live' : ' chip-quiet'}`}>
            {realai?.reachable ? 'up' : 'fallback'}
          </span>
        </div>
      </div>

      {today && (
        <div className="card stack">
          <span className="chip chip-live">Daily drill block</span>
          <h2 className="h2" style={{ fontSize: '1.25rem' }}>
            {today.title}
          </h2>
          <p className="muted">{today.description}</p>
          <div className="row">
            <span className="chip">{today.minutes} min</span>
            <span className="chip chip-gold">{today.difficulty}</span>
            <span className="chip">{today.focus}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              setDone((d) => ({ ...d, [today.id]: true }));
              push('Drill logged', 'ok');
            }}
          >
            {done[today.id] ? 'Completed ✓' : 'Start drill'}
          </button>
        </div>
      )}

      <div className="section-title">
        <h2>More drills</h2>
        <button type="button" className="link" onClick={() => setAnalyzeOpen(true)}>
          Analyze clip
        </button>
      </div>

      <div className="stack">
        {drills.slice(1).map((d) => (
          <article key={d.id} className="card">
            <div className="row-between">
              <h3 style={{ fontWeight: 600 }}>{d.title}</h3>
              <span className="chip">{d.minutes}m</span>
            </div>
            <p className="muted" style={{ fontSize: '0.88rem', marginTop: 6 }}>
              {d.description}
            </p>
          </article>
        ))}
      </div>

      {analysis && (
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Last analysis
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font)',
              fontSize: '0.9rem',
              lineHeight: 1.45,
              color: 'var(--text-muted)',
            }}
          >
            {analysis}
          </pre>
        </div>
      )}

      <div className="banner banner-info">
        SOTD mixes fundamentals with exhibition-style shots inspired by public repertoires (Massey,
        Venom, artistic pool). Catalog rotates so you won&apos;t see the same shot again until the
        full list has cycled.
      </div>

      <Modal open={analyzeOpen} title="Shot analysis" onClose={() => setAnalyzeOpen(false)}>
        <div className="stack">
          <div className="field">
            <label>Notes</label>
            <textarea
              className="input"
              style={{ minHeight: 90, paddingTop: 12, resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Long straight missed thin…"
            />
          </div>
          <div className="field">
            <label>Video URL (optional)</label>
            <input
              className="input"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={runAnalyze}>
            {busy ? 'Analyzing…' : 'Run coach'}
          </button>
        </div>
      </Modal>
    </div>
  );
}