import { describe, expect, it } from 'vitest';
import { languageContentCatalog } from './contentCatalog';
import { createContentQualityReport, formatContentQualityReport } from './contentQuality';

describe('language content quality gate', () => {
  const report = createContentQualityReport();

  it('keeps the versioned catalog free from release-blocking errors', () => {
    expect(report.errors, formatContentQualityReport(report)).toEqual([]);
  });

  it('covers every word with a visual and every skill with three evidence paths', () => {
    expect(report.totals.visualWords).toBe(report.totals.words);
    report.skillCoverage.forEach((row) => {
      expect(row.activityKinds.length, row.skillId).toBeGreaterThanOrEqual(2);
      expect(row.recognition, row.skillId).toBe(true);
      expect(row.production, row.skillId).toBe(true);
      expect(row.contextual, row.skillId).toBe(true);
    });
  });

  it('reports malformed additions with actionable issue codes', () => {
    const first = languageContentCatalog.koreanWords[0];
    const broken = createContentQualityReport({
      ...languageContentCatalog,
      koreanWords: [...languageContentCatalog.koreanWords, { ...first, skillIds: [], id: first.id }]
    });
    expect(broken.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining(['duplicate-id', 'duplicate-answer', 'missing-skill']));
  });

  it('formats a developer-readable coverage report', () => {
    const output = formatContentQualityReport(report);
    expect(output).toContain('언어 콘텐츠 품질 리포트');
    expect(output).toContain('기술 | 낱말 | 그림 | 이야기 장면 | 활동');
  });

  const reportEnabled = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.CONTENT_REPORT === '1';
  if (reportEnabled) console.info(`\n${formatContentQualityReport(report)}\n`);
});
