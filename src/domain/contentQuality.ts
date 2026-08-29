import { stories, validateStories } from '../story/storyData';
import { conceptVisuals, questionConceptIds } from '../visuals/visualAssets';
import {
  LANGUAGE_CONTENT_SCHEMA_VERSION,
  languageContentCatalog,
  type LanguageContentCatalog
} from './contentCatalog';
import { skillActivityCoverage } from './skillData';
import type { EnglishWord, KoreanWord, LanguageActivityKind } from './types';

type LanguageWord = KoreanWord | EnglishWord;
type QualitySeverity = 'error' | 'warning';

export interface ContentQualityIssue {
  severity: QualitySeverity;
  code: string;
  itemId: string;
  message: string;
}

export interface SkillCoverageRow {
  skillId: string;
  language: string;
  wordCount: number;
  visualWordCount: number;
  storySceneCount: number;
  activityKinds: readonly LanguageActivityKind[];
  recognition: boolean;
  production: boolean;
  contextual: boolean;
}

export interface ContentQualityReport {
  schemaVersion: number;
  generatedFor: 'language-content';
  totals: {
    koreanWords: number;
    englishWords: number;
    words: number;
    visualWords: number;
    stories: number;
    storyScenes: number;
    skills: number;
  };
  skillCoverage: SkillCoverageRow[];
  errors: ContentQualityIssue[];
  warnings: ContentQualityIssue[];
}

const MIN_WORDS_PER_SKILL = 12;

const activityKindsFor = (skillId: string): LanguageActivityKind[] => {
  const coverage = skillActivityCoverage.get(skillId);
  return coverage
    ? [...new Set([...coverage.recognition, ...coverage.production, ...coverage.contextual])]
    : [];
};

const correctChunksFor = (word: LanguageWord): Set<string> => new Set(
  word.maskRanges.map(({ start, length }) => Array.from(word.word).slice(start, start + length).join('').toLocaleLowerCase())
);

export const createContentQualityReport = (
  catalog: LanguageContentCatalog = languageContentCatalog
): ContentQualityReport => {
  const errors: ContentQualityIssue[] = [];
  const warnings: ContentQualityIssue[] = [];
  const words: LanguageWord[] = [...catalog.koreanWords, ...catalog.englishWords];
  const wordById = new Map(words.map((word) => [word.id, word]));
  const skillIds = new Set(catalog.skills.map((skill) => skill.id));
  const add = (severity: QualitySeverity, code: string, itemId: string, message: string) => {
    (severity === 'error' ? errors : warnings).push({ severity, code, itemId, message });
  };

  if (catalog.schemaVersion !== LANGUAGE_CONTENT_SCHEMA_VERSION) {
    add('error', 'schema-version', 'catalog', `지원하는 스키마 버전은 ${LANGUAGE_CONTENT_SCHEMA_VERSION}입니다.`);
  }

  const seenIds = new Set<string>();
  const seenLabels = new Map<string, string>();
  words.forEach((word) => {
    if (seenIds.has(word.id)) add('error', 'duplicate-id', word.id, '낱말 ID가 중복됩니다.');
    seenIds.add(word.id);

    const language = word.id.startsWith('ko-') ? 'korean' : word.id.startsWith('en-') ? 'english' : undefined;
    const expectedId = language === 'korean' ? /^ko-(easy|normal|hard|challenge)-\d+$/ : /^en-(easy|normal|hard|challenge)-\d+$/;
    if (!language || !expectedId.test(word.id)) add('error', 'invalid-id', word.id, '언어·난이도 형식에 맞는 ID가 필요합니다.');
    if (!word.word.trim() || !word.category.trim()) add('error', 'required-field', word.id, '표제어와 범주는 비어 있을 수 없습니다.');

    const labelKey = `${language ?? 'unknown'}:${word.word.trim().toLocaleLowerCase()}`;
    const duplicateOf = seenLabels.get(labelKey);
    if (duplicateOf) add('error', 'duplicate-answer', word.id, `${duplicateOf}와 같은 정답 표제어입니다.`);
    else seenLabels.set(labelKey, word.id);

    if (!word.skillIds.length) add('error', 'missing-skill', word.id, '연결된 학습 기술이 없습니다.');
    word.skillIds.forEach((skillId) => {
      const skill = catalog.skills.find((candidate) => candidate.id === skillId);
      if (!skillIds.has(skillId) || !skill) add('error', 'unknown-skill', word.id, `알 수 없는 기술 ${skillId}입니다.`);
      else if (language && skill.language !== language) add('error', 'language-skill-mismatch', word.id, `${skillId}의 언어가 낱말과 다릅니다.`);
    });

    const conceptId = questionConceptIds[word.id];
    if (!conceptId || !conceptVisuals[conceptId]) add('error', 'missing-visual', word.id, '연결된 개념 그림이 없습니다.');
    else if (!conceptVisuals[conceptId].alt.trim()) add('error', 'missing-visual-alt', word.id, '개념 그림의 대체 설명이 없습니다.');

    const activityKinds = new Set(word.skillIds.flatMap(activityKindsFor));
    if (activityKinds.size < 2) add('error', 'activity-variety', word.id, '서로 다른 활동이 최소 2개 필요합니다.');

    const correctChunks = correctChunksFor(word);
    const ambiguousChunk = word.distractorChunks?.find((chunk) => correctChunks.has(chunk.toLocaleLowerCase()));
    if (ambiguousChunk) add('error', 'ambiguous-distractor', word.id, `오답 조각 “${ambiguousChunk}”이 정답 조각과 같습니다.`);
  });

  Object.keys(questionConceptIds).forEach((wordId) => {
    if (!wordById.has(wordId)) add('warning', 'orphan-visual', wordId, '사용하지 않는 개념 그림 연결입니다.');
  });

  validateStories(stories).forEach((message, index) => {
    add('error', 'story-validation', `story-${index + 1}`, message);
  });

  const storySceneCountBySkill = new Map<string, number>();
  stories.flatMap((story) => story.scenes).forEach((scene) => {
    scene.skillIds.forEach((skillId) => storySceneCountBySkill.set(skillId, (storySceneCountBySkill.get(skillId) ?? 0) + 1));
  });

  const skillCoverage = catalog.skills.map((skill): SkillCoverageRow => {
    const skillWords = words.filter((word) => word.skillIds.includes(skill.id));
    const coverage = skillActivityCoverage.get(skill.id);
    const row: SkillCoverageRow = {
      skillId: skill.id,
      language: skill.language,
      wordCount: skillWords.length,
      visualWordCount: skillWords.filter((word) => Boolean(questionConceptIds[word.id])).length,
      storySceneCount: storySceneCountBySkill.get(skill.id) ?? 0,
      activityKinds: activityKindsFor(skill.id),
      recognition: Boolean(coverage?.recognition.length),
      production: Boolean(coverage?.production.length),
      contextual: Boolean(coverage?.contextual.length)
    };
    if (row.wordCount < MIN_WORDS_PER_SKILL) add('error', 'skill-word-coverage', skill.id, `연결 낱말이 ${row.wordCount}개입니다. 최소 ${MIN_WORDS_PER_SKILL}개가 필요합니다.`);
    if (!row.recognition) add('error', 'recognition-coverage', skill.id, '인식형 활동이 없습니다.');
    if (!row.production) add('error', 'production-coverage', skill.id, '생산형 활동이 없습니다.');
    if (!row.contextual) add('error', 'contextual-coverage', skill.id, '문맥형 활동이 없습니다.');
    if (!row.storySceneCount) add('warning', 'story-transfer-coverage', skill.id, '이 기술을 실제로 담은 이야기 장면이 아직 없습니다.');
    return row;
  });

  return {
    schemaVersion: catalog.schemaVersion,
    generatedFor: 'language-content',
    totals: {
      koreanWords: catalog.koreanWords.length,
      englishWords: catalog.englishWords.length,
      words: words.length,
      visualWords: words.filter((word) => Boolean(questionConceptIds[word.id])).length,
      stories: stories.length,
      storyScenes: stories.reduce((sum, story) => sum + story.scenes.length, 0),
      skills: catalog.skills.length
    },
    skillCoverage,
    errors,
    warnings
  };
};

export const formatContentQualityReport = (report: ContentQualityReport): string => {
  const { totals } = report;
  const lines = [
    `언어 콘텐츠 품질 리포트 (schema v${report.schemaVersion})`,
    `낱말 ${totals.words}개 (한국어 ${totals.koreanWords}, 영어 ${totals.englishWords}) · 그림 ${totals.visualWords}/${totals.words}`,
    `기술 ${totals.skills}개 · 이야기 ${totals.stories}편/${totals.storyScenes}장면`,
    '',
    '기술 | 낱말 | 그림 | 이야기 장면 | 활동',
    ...report.skillCoverage.map((row) => `${row.skillId} | ${row.wordCount} | ${row.visualWordCount} | ${row.storySceneCount} | ${row.activityKinds.join(', ')}`),
    '',
    `결과: 오류 ${report.errors.length}개 · 경고 ${report.warnings.length}개`
  ];
  [...report.errors, ...report.warnings].forEach((issue) => lines.push(`[${issue.severity.toUpperCase()}] ${issue.code}/${issue.itemId}: ${issue.message}`));
  return lines.join('\n');
};
