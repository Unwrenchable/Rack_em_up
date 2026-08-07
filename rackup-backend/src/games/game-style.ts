/**
 * First-class RackUp game styles.
 * Stored on matches as `game` string (value of enum).
 */
export enum GameStyle {
  EIGHT_BALL = '8-ball',
  NINE_BALL = '9-ball',
  TEN_BALL = '10-ball',
  ONE_POCKET = 'one-pocket',
  /** Classical numbered-ball points race (table size → rack; skill → target). */
  RACKUP_PYRAMID = 'rackup-pyramid',
}

export function isRackupPyramid(game?: string | null): boolean {
  if (!game) return false;
  const g = game.toLowerCase().replace(/\s+/g, '-');
  return (
    g === GameStyle.RACKUP_PYRAMID ||
    g === 'rackup_pyramid' ||
    g === 'pyramid' ||
    g.includes('pyramid')
  );
}

export function normalizeGameStyle(game?: string | null): GameStyle | string {
  if (!game) return GameStyle.NINE_BALL;
  if (isRackupPyramid(game)) return GameStyle.RACKUP_PYRAMID;
  const g = game.toLowerCase().replace(/\s+/g, '-');
  if (g.includes('8')) return GameStyle.EIGHT_BALL;
  if (g.includes('10')) return GameStyle.TEN_BALL;
  if (g.includes('one') || g.includes('pocket')) return GameStyle.ONE_POCKET;
  if (g.includes('9')) return GameStyle.NINE_BALL;
  return g;
}
