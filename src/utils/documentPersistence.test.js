import { mergeSectionDocuments } from './documentPersistence';

describe('mergeSectionDocuments', () => {
  it('keeps only documents for the requested section when merging', () => {
    const merged = mergeSectionDocuments(
      [
        { id: 'meeting-file', name: 'meeting', sectionType: 'meeting', sectionId: 'meeting-1' },
        { id: 'project-file', name: 'project', sectionType: 'project', sectionId: 'project-1' },
      ],
      [
        { id: 'project-file-2', name: 'project-2', sectionType: 'project', sectionId: 'project-1' },
        { id: 'daily-file', name: 'daily', sectionType: 'daily-update', sectionId: 'daily-1' },
      ],
      'project',
      'project-1'
    );

    expect(merged.map((doc) => doc.id)).toEqual(['project-file', 'project-file-2']);
  });

  it('sorts documents by uploadedAt in descending order', () => {
    const merged = mergeSectionDocuments(
      [
        { id: 'older', name: 'older', uploadedAt: '2024-01-01T00:00:00.000Z', sectionType: 'meeting', sectionId: 'meeting-1' },
        { id: 'newer', name: 'newer', uploadedAt: '2024-02-01T00:00:00.000Z', sectionType: 'meeting', sectionId: 'meeting-1' },
      ],
      [
        { id: 'middle', name: 'middle', uploadedAt: '2024-01-15T00:00:00.000Z', sectionType: 'meeting', sectionId: 'meeting-1' },
      ],
      'meeting',
      'meeting-1'
    );

    expect(merged.map((doc) => doc.id)).toEqual(['newer', 'middle', 'older']);
  });
});
