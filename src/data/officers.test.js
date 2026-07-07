import { AUTHORITY_HIERARCHY, getAuthorityOptions, getDesignationDisplayLabel, registerAuthorityOption, resolveMeetingDesignation } from './officers';
import { mergeSectionDocuments } from '../utils/documentPersistence';

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

  it('includes top-level officials and registered custom designations', () => {
    window.localStorage.removeItem('kesco_custom_authority_options_v1');
    const options = getAuthorityOptions();
    expect(options.some((option) => option.value === 'Managing Director (MD)')).toBe(true);
    expect(options.some((option) => option.value === 'Directors')).toBe(true);
    registerAuthorityOption('Chief Engineer');
    const updatedOptions = getAuthorityOptions();
    expect(updatedOptions.some((option) => option.value === 'Chief Engineer')).toBe(true);
  });

  it('formats the person name before the designation when both are present', () => {
    expect(getDesignationDisplayLabel('Asha', 'Executive Engineer')).toBe('Asha — Executive Engineer');
    expect(getDesignationDisplayLabel('', 'Executive Engineer')).toBe('Executive Engineer');
  });

  it('keeps the meeting designation resolver simple', () => {
    expect(resolveMeetingDesignation('Executive Engineer')).toBe('Executive Engineer');
  });

  it('merges remote and local project documents without duplicates', () => {
    const remoteDocuments = [{ id: 'remote-1', name: 'Remote report', url: 'https://example.com/remote' }];
    const localDocuments = [{ id: 'remote-1', name: 'Remote report', url: 'https://example.com/remote' }, { id: 'local-1', name: 'Local report', url: 'https://example.com/local' }];

    const merged = mergeSectionDocuments(remoteDocuments, localDocuments);

    expect(merged).toHaveLength(2);
    expect(merged.map((doc) => doc.id)).toEqual(['remote-1', 'local-1']);
  });
});
