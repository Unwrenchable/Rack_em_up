import { computeRackupShadow } from './shadow-rating';
import { ROC_DEFAULT_RATING, ROC_DEFAULT_RD } from '../users/rating-display';

describe('computeRackupShadow', () => {
  it('keeps ROC default 500 and does not write a 0–3000 scale', () => {
    const s = computeRackupShadow({
      rating: ROC_DEFAULT_RATING,
      rd: ROC_DEFAULT_RD,
      matches: 0,
    });
    expect(s.rating).toBe(500);
    expect(s.rating).toBeLessThan(900);
    expect(s.official).toBe(false);
  });
});
