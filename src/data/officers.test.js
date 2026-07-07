import { AUTHORITY_HIERARCHY, getAuthorityOptions, getDesignationDisplayLabel, resolveMeetingDesignation } from './officers';

describe('authority hierarchy', () => {
  it('keeps the hierarchy data available for reference', () => {
    expect(AUTHORITY_HIERARCHY).toHaveLength(1);
    expect(AUTHORITY_HIERARCHY[0].children.length).toBeGreaterThan(0);
  });

  it('exposes final designation options without the full hierarchy path', () => {
    const options = getAuthorityOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((option) => option.value === 'Executive Engineer-I (11 KV & LT)')).toBe(true);
    expect(options.some((option) => option.value.includes('>'))).toBe(false);
  });

  it('formats the person name before the designation when both are present', () => {
    expect(getDesignationDisplayLabel('Asha', 'Executive Engineer')).toBe('Asha — Executive Engineer');
    expect(getDesignationDisplayLabel('', 'Executive Engineer')).toBe('Executive Engineer');
  });

  it('keeps the meeting designation resolver simple', () => {
    expect(resolveMeetingDesignation('Executive Engineer')).toBe('Executive Engineer');
  });
});
