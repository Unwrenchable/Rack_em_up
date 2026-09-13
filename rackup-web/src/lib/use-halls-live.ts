import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { fetchHalls, getSocketUrl, getToken } from './api';
import type { Hall } from './types';

const POLL_MS = 12_000;

/**
 * Halls / Find maps: refetch when verification changes without remounting the app.
 * Sources: interval, tab focus, and `halls:updated` from the social socket.
 */
export function useHallsLive(opts?: { verifiedOnly?: boolean }) {
  const verifiedOnly = !!opts?.verifiedOnly;
  const [halls, setHalls] = useState<Hall[] | null>(null);

  const refresh = useCallback(async () => {
    const rows = await fetchHalls({ verifiedOnly });
    setHalls(rows);
  }, [verifiedOnly]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => {
      void refresh();
    }, POLL_MS);

    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);

    const token = getToken();
    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      auth: token && token !== 'demo' ? { token } : undefined,
    });
    socket.on('halls:updated', () => {
      void refresh();
    });

    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
      socket.disconnect();
    };
  }, [refresh]);

  return { halls, refresh, setHalls };
}
