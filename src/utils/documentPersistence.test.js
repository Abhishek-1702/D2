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
});
