import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../lib/brand';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)');
  const ios = 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return mq.matches || ios;
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

type Props = { variant?: 'full' | 'compact' };

export function GetTheApp({ variant = 'full' }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [busy, setBusy] = useState(false);
  const ios = isIos();

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
    } finally {
      setDeferred(null);
      setBusy(false);
    }
  }

  async function shareApp() {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: BRAND.title, text: BRAND.shareText, url });
        return;
      } catch {
        /* user cancelled or share failed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  if (variant === 'compact') {
    return (
      <section className="card get-app get-app-compact">
        <img className="brand-mark" src="/icon-192.png" width={48} height={48} alt="" />
        <div className="get-app-copy">
          <h2>Get the app</h2>
          <p className="muted">
            {installed
              ? 'You are running the installed RackUp app.'
              : 'Install RackUp on your phone for a full-screen felt home screen.'}
          </p>
        </div>
        {installed ? (
          <span className="chip chip-gold">Installed</span>
        ) : deferred ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={install} disabled={busy}>
            {busy ? 'Installing…' : 'Install'}
          </button>
        ) : (
          <Link to="/settings" className="btn btn-secondary btn-sm">
            How
          </Link>
        )}
      </section>
    );
  }

  return (
    <section className="stack get-app-full" style={{ gap: 12 }}>
      <div className="section-title">
        <h2>Get the app</h2>
      </div>
      <div className="card card-glow stack get-app" style={{ gap: 14 }}>
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <img className="brand-mark brand-mark-lg" src="/icon-192.png" width={64} height={64} alt="RackUp" />
          <div>
            <div className="logo-mark logo-mark-sm">RACKUP</div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Rack of Champions · add to your home screen
            </p>
          </div>
        </div>

        {installed ? (
          <div className="banner banner-info">RackUp is installed on this device.</div>
        ) : (
          <>
            {deferred && (
              <button type="button" className="btn btn-primary btn-block" onClick={install} disabled={busy}>
                {busy ? 'Installing…' : 'Install RackUp'}
              </button>
            )}
            <ol className="get-app-steps muted">
              {ios ? (
                <>
                  <li>Tap the Share button in Safari.</li>
                  <li>Scroll and choose Add to Home Screen.</li>
                  <li>Tap Add — RackUp opens like a native app.</li>
                </>
              ) : (
                <>
                  <li>Open this site in Chrome or Edge.</li>
                  <li>Use the browser menu → Install app / Add to Home Screen.</li>
                  <li>Launch RackUp from your home screen or app drawer.</li>
                </>
              )}
            </ol>
          </>
        )}

        <button type="button" className="btn btn-ghost btn-block" onClick={shareApp}>
          Share RackUp link
        </button>

        <div className="get-app-stores">
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Native store listings are not live yet. These stay placeholders — no fake links.
          </p>
          <button type="button" className="btn btn-ghost btn-block" disabled>
            App Store — coming soon
          </button>
          <button type="button" className="btn btn-ghost btn-block" disabled>
            Google Play — coming soon
          </button>
        </div>
      </div>
    </section>
  );
}
