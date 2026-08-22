import { describe, expect, it } from 'vitest';
import { englishWords } from '../data/englishWords';
import { koreanWords } from '../data/koreanWords';
import { englishPairs, koreanPairs } from '../memory/memoryData';
import { conceptVisuals, memoryPairConceptIds, questionConceptIds, storyCoverVisuals, storySceneVisuals } from './visualAssets';

describe('illustration asset manifest', () => {
  it('네 단계 이야기 스물네 편의 모든 장면과 표지를 연결한다', () => {
    const storyDefinitions = [
      ['sprout-rain-umbrella', 3],
      ['sprout-lost-mitten', 3],
      ['sprout-seed-water', 3],
      ['sprout-cookie-share', 3],
      ['sprout-puppy-bowl', 3],
      ['sprout-night-book', 3],
      ['step-library-book', 4],
      ['step-lunchbox', 4],
      ['step-windy-hat', 4],
      ['step-frog-road', 4],
      ['step-morning-clock', 4],
      ['step-paper-airplane', 4],
      ['explorer-bee-garden', 5],
      ['explorer-team-poster', 5],
      ['explorer-ice-cup', 5],
      ['explorer-bus-seat', 5],
      ['explorer-map-picnic', 5],
      ['explorer-apology-vase', 5],
      ['thinker-stream-trash', 6],
      ['thinker-fair-rules', 6],
      ['thinker-solar-oven', 6],
      ['thinker-rumor-message', 6],
      ['thinker-old-tree', 6],
      ['thinker-power-outage', 6]
    ] as const;
    const storyIds = storyDefinitions.map(([storyId]) => storyId);
    const ids = storyDefinitions.flatMap(([storyId, sceneCount]) => [1, 2, 3, 4, 5, 6]
      .slice(0, sceneCount)
      .map((scene) => `${storyId}-scene-${scene}`)
    );

    expect(Object.keys(storySceneVisuals)).toHaveLength(108);
    expect(Object.keys(storySceneVisuals)).toEqual(expect.arrayContaining(ids));
    ids.forEach((id) => {
      const visual = storySceneVisuals[id];
      expect(visual.alt.length).toBeGreaterThan(15);
      expect(visual.aspectRatio).toBe('1/1');
      expect(visual.src).toMatch(/illustrations\/stories\/(sprout|step|explorer|thinker)-[a-z-]+\/scene-[1-6]\.webp$/);
    });
    expect(Object.keys(storyCoverVisuals)).toHaveLength(24);
    storyIds.forEach((storyId) => {
      expect(storyCoverVisuals[storyId].src).toMatch(new RegExp(`illustrations/stories/covers/${storyId}\\.webp$`));
      expect(storyCoverVisuals[storyId].alt.length).toBeGreaterThan(10);
    });
  });

  it('한국어·영어·기억력이 같은 개념 그림을 공유한다', () => {
    expect(Object.keys(conceptVisuals)).toHaveLength(284);
    expect(Object.keys(conceptVisuals)).toEqual(expect.arrayContaining([
      'apple', 'puppy', 'library', 'happy', 'school', 'friend', 'family', 'teacher',
      'morning', 'evening', 'spring', 'autumn', 'pencil', 'umbrella', 'hospital',
      'firefighter', 'chef', 'wise', 'strong', 'kind', 'proverb', 'diary', 'promise',
      'courage', 'small', 'large', 'fast', 'slow', 'laugh', 'listen', 'write', 'learn',
      'playground', 'tiger', 'frog', 'turtle', 'penguin', 'squirrel', 'eraser', 'classroom',
      'potato', 'carrot', 'rainbow', 'dolphin', 'kangaroo', 'sandwich', 'chocolate',
      'astronaut', 'veterinarian', 'photographer', 'water', 'bread', 'grape', 'lemon',
      'pizza', 'candy', 'juice', 'peach', 'horse', 'sheep', 'mouse', 'panda', 'whale',
      'snake', 'chair', 'paper', 'ruler', 'green', 'white', 'black', 'brown', 'cloud',
      'river', 'ocean', 'house', 'park', 'store', 'room', 'smile', 'sleep', 'dance',
      'car', 'bicycle', 'airplane', 'train', 'bus', 'blackboard', 'desk', 'colored-pencils',
      'chick', 'gimbap', 'tteokbokki', 'corn', 'sun', 'moon', 'starlight', 'flower-garden',
      'stream', 'scarf', 'gloves', 'toothpaste', 'towel', 'clock', 'mirror',
      'flower', 'father', 'mother', 'sister', 'brother', 'student', 'rabbit', 'monkey',
      'chicken', 'giraffe', 'hamster', 'orange', 'banana', 'cookie', 'cheese', 'tomato',
      'noodle', 'window', 'kitchen', 'garden', 'lesson', 'picture', 'summer', 'winter',
      'school-field', 'cafeteria', 'art-class', 'school-noticebook', 'dictation', 'zoo',
      'polar-bear', 'mole', 'firefly', 'spring-breeze', 'sudden-shower', 'snowman',
      'sunflower', 'dandelion', 'leaf', 'traffic-light', 'crosswalk', 'post-office',
      'fire-station', 'appointment-time', 'grandfather', 'grandmother', 'younger-cousin',
      'neighbor', 'rice-ball', 'yogurt', 'bean-sprouts', 'tangerine-peel',
      'elephant', 'butterfly', 'crocodile', 'octopus', 'flamingo', 'seahorse',
      'breakfast', 'pancake', 'vegetable', 'mushroom', 'spaghetti', 'computer',
      'notebook', 'question', 'homework', 'language', 'science', 'calendar',
      'mountain', 'sunshine', 'snowflake', 'waterfall', 'island', 'forest',
      'weather', 'station', 'museum', 'ice-cream', 'science-experiment', 'sports-day',
      'class-meeting', 'school-supplies', 'reading-log', 'presentation-time',
      'morning-sunlight', 'sunset-glow', 'milky-way', 'water-drop', 'pine-cone',
      'garden-balsam', 'public-transport', 'seat-belt', 'recyclables', 'waste-sorting',
      'laundry-basket', 'microwave', 'street-cleaner', 'driver', 'children-author',
      'red-squirrel', 'orangutan', 'lizard', 'stag-beetle', 'sea-turtle', 'baby-goat',
      'spicy-noodles', 'candied-sweet-potato', 'rolled-omelet', 'seaweed-soup',
      'stir-fried-vegetables', 'fruit-salad',
      'strawberry', 'dictionary', 'restaurant', 'adventure', 'beautiful', 'different',
      'important', 'wonderful', 'carefully', 'together', 'sometimes', 'yesterday',
      'tomorrow', 'afternoon', 'wednesday', 'scientist', 'musician', 'engineer',
      'librarian', 'environment', 'earthquake', 'temperature', 'electricity', 'ecosystem',
      'recycling', 'continent', 'universe', 'supermarket', 'bookstore', 'helicopter',
      'ambulance', 'submarine', 'spaceship', 'nature-observation', 'field-trip',
      'group-activity', 'study-plan', 'book-discussion', 'science-museum', 'global-warming',
      'thunder-lightning', 'sea-level', 'freshwater-fish', 'forest-protection',
      'traffic-safety', 'personal-information', 'emergency-contacts', 'daily-habits',
      'energy-saving', 'public-facility', 'cultural-guide', 'weather-forecaster', 'paramedic',
      'software-developer', 'cultural-restorer', 'endangered-species',
      'migratory-bird-habitat', 'food-chain', 'hibernation', 'camouflage', 'amphibian',
      'nutrients', 'fermented-food', 'food-storage', 'seasonal-fruit', 'balanced-meal',
      'traditional-food'
    ]));
    Object.values(conceptVisuals).forEach((visual) => {
      expect(visual.src).toMatch(/illustrations\/concepts\/[a-z-]+\.webp$/);
      expect(visual.alt.length).toBeGreaterThan(10);
    });
    expect(questionConceptIds['en-normal-34']).toBe('library');
    expect(questionConceptIds['ko-normal-1']).toBe('library');
    expect(memoryPairConceptIds.e01).toBe('apple');
    expect(memoryPairConceptIds.k02).toBe('apple');
    expect(memoryPairConceptIds.e11).toBe('spring');
    expect(memoryPairConceptIds.k15).toBe('spring');
    expect(questionConceptIds['en-normal-9']).toBe('teacher');
    expect(questionConceptIds['ko-easy-7']).toBe('teacher');
    expect(questionConceptIds['en-normal-30']).toBe('pencil');
    expect(questionConceptIds['ko-normal-23']).toBe('hospital');
    expect(questionConceptIds['en-hard-31']).toBe('hospital');
    expect(questionConceptIds['en-challenge-18']).toBe('firefighter');

    const sharedQuestionConcepts = [
      ['playground', 'ko-easy-1', 'en-challenge-32'], ['tiger', 'ko-easy-13', 'en-easy-14'],
      ['frog', 'ko-easy-17', 'en-easy-16'], ['turtle', 'ko-easy-16', 'en-normal-14'],
      ['penguin', 'ko-easy-15', 'en-normal-17'], ['squirrel', 'ko-easy-14', 'en-hard-5'],
      ['eraser', 'ko-easy-8', 'en-normal-31'], ['classroom', 'ko-easy-10', 'en-challenge-34'],
      ['potato', 'ko-easy-22', 'en-normal-25'], ['carrot', 'ko-easy-23', 'en-normal-21'],
      ['rainbow', 'ko-easy-24', 'en-hard-24'], ['dolphin', 'ko-normal-8', 'en-normal-13'],
      ['kangaroo', 'ko-normal-10', 'en-hard-2'], ['sandwich', 'ko-normal-32', 'en-hard-10'],
      ['chocolate', 'ko-normal-35', 'en-hard-13'], ['astronaut', 'ko-hard-21', 'en-challenge-16'],
      ['veterinarian', 'ko-hard-20', 'en-challenge-21'], ['photographer', 'ko-hard-25', 'en-challenge-20'],
      ['librarian', 'ko-challenge-22', 'en-challenge-23'], ['ecosystem', 'ko-challenge-12', 'en-challenge-28']
    ] as const;
    sharedQuestionConcepts.forEach(([conceptId, koreanId, englishId]) => {
      expect(questionConceptIds[koreanId]).toBe(conceptId);
      expect(questionConceptIds[englishId]).toBe(conceptId);
    });
    const englishEasyConcepts = [
      ['water', 'en-easy-2'], ['bread', 'en-easy-3'], ['grape', 'en-easy-4'],
      ['lemon', 'en-easy-5'], ['pizza', 'en-easy-6'], ['candy', 'en-easy-7'],
      ['juice', 'en-easy-8'], ['peach', 'en-easy-9'], ['horse', 'en-easy-10'],
      ['sheep', 'en-easy-11'], ['mouse', 'en-easy-12'], ['panda', 'en-easy-13'],
      ['whale', 'en-easy-15'], ['snake', 'en-easy-17'], ['chair', 'en-easy-18'],
      ['paper', 'en-easy-19'], ['ruler', 'en-easy-20']
    ] as const;
    englishEasyConcepts.forEach(([conceptId, questionId]) => {
      expect(questionConceptIds[questionId]).toBe(conceptId);
    });
    const remainingEnglishEasyConcepts = [
      ['green', 'en-easy-21'], ['white', 'en-easy-22'], ['black', 'en-easy-23'],
      ['brown', 'en-easy-24'], ['cloud', 'en-easy-25'], ['river', 'en-easy-26'],
      ['ocean', 'en-easy-27'], ['house', 'en-easy-28'], ['park', 'en-easy-29'],
      ['store', 'en-easy-30'], ['room', 'en-easy-31'], ['smile', 'en-easy-33'],
      ['sleep', 'en-easy-34'], ['dance', 'en-easy-35']
    ] as const;
    remainingEnglishEasyConcepts.forEach(([conceptId, questionId]) => {
      expect(questionConceptIds[questionId]).toBe(conceptId);
    });
    englishWords
      .filter((word) => word.difficulty === 'easy')
      .forEach((word) => expect(questionConceptIds[word.id]).toBeDefined());
    const remainingKoreanEasyConcepts = [
      ['car', 'ko-easy-2'], ['bicycle', 'ko-easy-3'], ['airplane', 'ko-easy-4'],
      ['train', 'ko-easy-5'], ['bus', 'ko-easy-6'], ['blackboard', 'ko-easy-9'],
      ['desk', 'ko-easy-11'], ['colored-pencils', 'ko-easy-12'], ['chick', 'ko-easy-18'],
      ['gimbap', 'ko-easy-19'], ['tteokbokki', 'ko-easy-20'], ['corn', 'ko-easy-21'],
      ['sun', 'ko-easy-25'], ['moon', 'ko-easy-26'], ['starlight', 'ko-easy-27'],
      ['flower-garden', 'ko-easy-28'], ['stream', 'ko-easy-29'], ['scarf', 'ko-easy-30'],
      ['gloves', 'ko-easy-31'], ['toothpaste', 'ko-easy-32'], ['towel', 'ko-easy-33'],
      ['clock', 'ko-easy-34'], ['mirror', 'ko-easy-35']
    ] as const;
    remainingKoreanEasyConcepts.forEach(([conceptId, questionId]) => {
      expect(questionConceptIds[questionId]).toBe(conceptId);
    });
    koreanWords
      .filter((word) => word.difficulty === 'easy')
      .forEach((word) => expect(questionConceptIds[word.id]).toBeDefined());
    englishWords
      .filter((word) => word.difficulty === 'normal')
      .forEach((word) => expect(questionConceptIds[word.id]).toBeDefined());
    koreanWords
      .filter((word) => word.difficulty === 'normal')
      .forEach((word) => expect(questionConceptIds[word.id]).toBeDefined());
    englishWords
      .filter((word) => word.difficulty === 'hard')
      .forEach((word) => expect(questionConceptIds[word.id]).toBeDefined());
    koreanWords
      .filter((word) => word.difficulty === 'hard')
      .forEach((word) => expect(questionConceptIds[word.id]).toBeDefined());
    englishWords
      .filter((word) => word.difficulty === 'challenge')
      .forEach((word) => expect(questionConceptIds[word.id]).toBeDefined());
    koreanWords
      .filter((word) => word.difficulty === 'challenge')
      .forEach((word) => expect(questionConceptIds[word.id]).toBeDefined());
    expect(Object.keys(questionConceptIds)).toHaveLength(289);

    const languagePairIds = [...koreanPairs, ...englishPairs].map((pair) => pair.id);
    expect(Object.keys(memoryPairConceptIds)).toHaveLength(40);
    expect(Object.keys(memoryPairConceptIds)).toEqual(expect.arrayContaining(languagePairIds));
    languagePairIds.forEach((pairId) => {
      expect(conceptVisuals[memoryPairConceptIds[pairId]]).toBeDefined();
    });
  });
});
