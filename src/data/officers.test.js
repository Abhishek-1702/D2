import { AUTHORITY_HIERARCHY, resolveMeetingDesignation } from './officers';

describe('authority hierarchy', () => {
  it('exposes three authority levels with sub-positions', () => {
    expect(AUTHORITY_HIERARCHY).toHaveLength(3);
    expect(AUTHORITY_HIERARCHY[0].positions.length).toBeGreaterThan(0);
    expect(AUTHORITY_HIERARCHY[0].positions[0].persons.length).toBeGreaterThan(0);
  });

  it('uses the selected sub-position when no final person is chosen', () => {
    expect(resolveMeetingDesignation('Management', 'Director', '')).toBe('Director');
  });
});
