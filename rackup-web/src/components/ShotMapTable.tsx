/**
 * @deprecated Coordinate / machine-style SOTD breakdown was removed.
 * Human coaching lives in ShotCard; the diagram is self-explanatory.
 * This module is kept as a no-op export so old imports do not break.
 */
import type { SotdShotMap } from '../lib/types';

type Props = {
  map: SotdShotMap;
};

/** Intentionally empty — no coordinates, legends, or provider jargon. */
export function ShotMapTable(_props: Props) {
  return null;
}
