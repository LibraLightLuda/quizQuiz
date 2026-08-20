import type { Story, StoryActivityKind, StoryLevel } from './types';

export const STORY_LEVELS: StoryLevel[] = ['sprout', 'step', 'explorer', 'thinker'];

export const storyLevelInfo: Record<StoryLevel, { label: string; description: string; age: string; icon: string }> = {
  sprout: { label: '새싹', description: '그림과 짧은 이야기 3장면', age: '유치원 추천', icon: '🌱' },
  step: { label: '한걸음', description: '차근차근 읽는 4장면', age: '초등 1~2학년 추천', icon: '🐾' },
  explorer: { label: '탐험가', description: '이유와 마음을 찾는 5장면', age: '초등 3~4학년 추천', icon: '🧭' },
  thinker: { label: '생각왕', description: '근거까지 찾는 6장면', age: '초등 5~6학년 추천', icon: '💡' }
};

type SceneInput = readonly [illustration: string, text: string, alt: string];
type QuestionInput = {
  kind: StoryActivityKind;
  prompt: string;
  correct: string;
  wrong: readonly string[];
  evidence: number;
  hint: string;
  explanation: string;
};

const makeStory = (input: {
  id: string;
  title: string;
  level: StoryLevel;
  theme: string;
  cover: string;
  summary: string;
  scenes: readonly SceneInput[];
  detail: QuestionInput;
  thinking: QuestionInput;
}): Story => {
  const scenes = input.scenes.map(([illustration, text, alt], index) => ({
    id: `${input.id}-scene-${index + 1}`, illustration, text, alt
  }));
  const choice = (suffix: string, question: QuestionInput, evidenceRequired: boolean) => {
    const options = [question.correct, ...question.wrong].map((label, index) => ({
      id: `${input.id}-${suffix}-option-${index + 1}`, label
    }));
    return {
      id: `${input.id}-${suffix}`,
      type: 'choice' as const,
      kind: question.kind,
      prompt: question.prompt,
      options,
      correctOptionId: options[0].id,
      hint: question.hint,
      explanation: question.explanation,
      evidenceSceneId: scenes[question.evidence].id,
      evidenceRequired
    };
  };
  return {
    id: input.id, title: input.title, level: input.level, theme: input.theme,
    cover: input.cover, summary: input.summary, scenes,
    activities: [
      choice('detail', input.detail, false),
      {
        id: `${input.id}-sequence`, type: 'sequence', kind: 'sequence',
        prompt: '이야기에 나온 순서대로 장면을 놓아 보세요.',
        sceneIds: scenes.map((scene) => scene.id),
        hint: '처음에 있었던 일을 먼저 찾아보세요.',
        explanation: '이야기의 처음, 가운데, 끝을 차례로 떠올리면 순서를 찾을 수 있어요.'
      },
      choice('thinking', input.thinking, input.level === 'thinker')
    ]
  };
};

export const stories: Story[] = [
  makeStory({
    id: 'sprout-rain-umbrella', title: '비 오는 날의 우산', level: 'sprout', theme: '생활', cover: '☔', summary: '비 오는 날 서로 돕는 이야기',
    scenes: [['☁️', '하늘에 먹구름이 모였어요.', '회색 구름이 모인 하늘'], ['🌧️', '곧 비가 내려서 지우가 우산을 폈어요.', '빗속에서 우산을 편 지우'], ['☔', '지우는 우산이 없는 민수와 함께 걸었어요.', '한 우산을 함께 쓴 두 아이']],
    detail: { kind: 'detail', prompt: '지우가 편 것은 무엇인가요?', correct: '우산', wrong: ['모자'], evidence: 1, hint: '비를 막을 때 쓰는 물건이에요.', explanation: '비가 내리자 지우는 우산을 폈어요.' },
    thinking: { kind: 'emotion', prompt: '민수는 어떤 마음이었을까요?', correct: '고마웠어요', wrong: ['화가 났어요'], evidence: 2, hint: '친구가 우산을 함께 써 주었어요.', explanation: '지우가 도와주어서 민수는 고마웠을 거예요.' }
  }),
  makeStory({
    id: 'sprout-lost-mitten', title: '빨간 장갑 한 짝', level: 'sprout', theme: '관찰', cover: '🧤', summary: '잃어버린 장갑을 찾는 이야기',
    scenes: [['🧤', '유나는 놀이터에서 빨간 장갑 한 짝을 잃어버렸어요.', '빨간 장갑 한 짝과 놀이터'], ['🔍', '유나는 미끄럼틀 아래를 자세히 살펴보았어요.', '미끄럼틀 아래를 살펴보는 유나'], ['😊', '장갑을 찾은 유나는 활짝 웃었어요.', '장갑을 들고 웃는 유나']],
    detail: { kind: 'detail', prompt: '유나는 어디를 살펴보았나요?', correct: '미끄럼틀 아래', wrong: ['구름 위'], evidence: 1, hint: '놀이터에 있는 놀이 기구예요.', explanation: '유나는 미끄럼틀 아래를 살펴보았어요.' },
    thinking: { kind: 'cause', prompt: '유나가 웃은 까닭은 무엇인가요?', correct: '장갑을 찾아서', wrong: ['비가 내려서'], evidence: 2, hint: '유나가 잃어버렸던 물건을 생각해 보세요.', explanation: '잃어버린 장갑을 다시 찾아서 기뻤어요.' }
  }),
  makeStory({
    id: 'sprout-seed-water', title: '쑥쑥 자란 씨앗', level: 'sprout', theme: '자연', cover: '🌻', summary: '씨앗을 돌보는 이야기',
    scenes: [['🌰', '하나는 작은 씨앗을 화분에 심었어요.', '흙이 담긴 화분과 씨앗'], ['💧', '매일 씨앗에 물을 조금씩 주었어요.', '화분에 물을 주는 아이'], ['🌱', '며칠 뒤 초록 싹이 쏙 올라왔어요.', '화분에서 올라온 초록 싹']],
    detail: { kind: 'detail', prompt: '하나는 씨앗에 무엇을 주었나요?', correct: '물', wrong: ['눈'], evidence: 1, hint: '식물이 자랄 때 필요한 것이에요.', explanation: '하나는 씨앗에 매일 물을 주었어요.' },
    thinking: { kind: 'cause', prompt: '초록 싹이 올라온 까닭은 무엇일까요?', correct: '씨앗을 잘 돌봐서', wrong: ['화분을 숨겨서'], evidence: 2, hint: '하나가 매일 한 일을 떠올려 보세요.', explanation: '씨앗을 심고 물을 주며 돌보아서 싹이 났어요.' }
  }),
  makeStory({
    id: 'sprout-cookie-share', title: '반으로 나눈 쿠키', level: 'sprout', theme: '우정', cover: '🍪', summary: '친구와 나누는 이야기',
    scenes: [['🍪', '도윤에게 동그란 쿠키가 하나 있었어요.', '접시에 놓인 동그란 쿠키'], ['🤝', '도윤은 쿠키를 반으로 나누어 친구에게 주었어요.', '쿠키를 나누는 두 아이'], ['😄', '두 친구는 함께 먹으며 웃었어요.', '쿠키를 먹으며 웃는 두 친구']],
    detail: { kind: 'detail', prompt: '도윤은 쿠키를 어떻게 했나요?', correct: '반으로 나누었어요', wrong: ['가방에 숨겼어요'], evidence: 1, hint: '친구도 쿠키를 먹을 수 있었어요.', explanation: '도윤은 쿠키를 반으로 나누어 친구에게 주었어요.' },
    thinking: { kind: 'emotion', prompt: '두 친구의 마음은 어땠을까요?', correct: '즐거웠어요', wrong: ['무서웠어요'], evidence: 2, hint: '두 친구의 표정을 떠올려 보세요.', explanation: '함께 나누어 먹으며 두 친구는 즐거웠어요.' }
  }),
  makeStory({
    id: 'sprout-puppy-bowl', title: '강아지의 물그릇', level: 'sprout', theme: '돌봄', cover: '🐶', summary: '목마른 강아지를 돕는 이야기',
    scenes: [['🐶', '강아지 콩이가 빈 물그릇 옆에 앉아 있었어요.', '빈 물그릇 옆의 강아지'], ['🚰', '서준은 그릇에 깨끗한 물을 담았어요.', '물그릇에 물을 담는 아이'], ['🐕', '콩이는 물을 맛있게 마시고 꼬리를 흔들었어요.', '물을 마시며 꼬리를 흔드는 강아지']],
    detail: { kind: 'detail', prompt: '서준은 그릇에 무엇을 담았나요?', correct: '깨끗한 물', wrong: ['색종이'], evidence: 1, hint: '강아지가 목마를 때 마시는 것이에요.', explanation: '서준은 빈 그릇에 깨끗한 물을 담았어요.' },
    thinking: { kind: 'emotion', prompt: '콩이가 꼬리를 흔든 까닭은 무엇일까요?', correct: '물이 생겨 기뻐서', wrong: ['그릇이 비어서'], evidence: 2, hint: '콩이는 물을 맛있게 마셨어요.', explanation: '목을 축일 물이 생겨 콩이는 기뻤어요.' }
  }),
  makeStory({
    id: 'sprout-night-book', title: '잠들기 전 그림책', level: 'sprout', theme: '가족', cover: '📖', summary: '가족과 책을 읽는 이야기',
    scenes: [['🌙', '밤이 되어 방 안이 조용해졌어요.', '달이 뜬 조용한 방'], ['📖', '엄마는 소라에게 그림책을 읽어 주었어요.', '함께 그림책을 읽는 엄마와 아이'], ['😴', '소라는 이야기를 떠올리며 포근하게 잠들었어요.', '이불을 덮고 잠든 아이']],
    detail: { kind: 'detail', prompt: '엄마는 소라에게 무엇을 읽어 주었나요?', correct: '그림책', wrong: ['지도'], evidence: 1, hint: '그림과 이야기가 함께 있는 책이에요.', explanation: '엄마는 소라에게 그림책을 읽어 주었어요.' },
    thinking: { kind: 'cause', prompt: '소라는 언제 잠들었나요?', correct: '그림책을 들은 뒤', wrong: ['아침밥을 먹기 전'], evidence: 2, hint: '이야기의 마지막 장면을 생각해 보세요.', explanation: '엄마가 읽어 준 그림책을 들은 뒤 포근하게 잠들었어요.' }
  }),

  makeStory({
    id: 'step-library-book', title: '도서관 책의 자리', level: 'step', theme: '약속', cover: '📚', summary: '책을 제자리에 돌려놓는 이야기',
    scenes: [['📚', '하린은 도서관에서 공룡 책을 골랐어요.', '도서관에서 공룡 책을 고른 아이'], ['🪑', '의자에 앉아 책을 끝까지 재미있게 읽었어요.', '의자에서 책을 읽는 아이'], ['🏷️', '책 옆의 번호표를 보고 원래 자리를 찾았어요.', '책 번호표를 살펴보는 아이'], ['✅', '하린은 책을 제자리에 꽂고 조용히 나왔어요.', '책을 책장에 꽂는 아이']],
    detail: { kind: 'detail', prompt: '하린은 무엇을 보고 책의 자리를 찾았나요?', correct: '책의 번호표', wrong: ['창밖의 구름', '의자의 색'], evidence: 2, hint: '책 옆에 붙은 작은 표시를 보았어요.', explanation: '하린은 책의 번호표를 보고 원래 자리를 찾았어요.' },
    thinking: { kind: 'cause', prompt: '책을 제자리에 꽂아야 하는 까닭은 무엇일까요?', correct: '다음 사람이 쉽게 찾도록', wrong: ['책을 더 무겁게 하려고', '도서관을 어둡게 하려고'], evidence: 3, hint: '다른 사람도 그 책을 찾을 거예요.', explanation: '책을 제자리에 두면 다음 사람도 쉽게 찾을 수 있어요.' }
  }),
  makeStory({
    id: 'step-lunchbox', title: '뒤바뀐 도시락', level: 'step', theme: '문제 해결', cover: '🍱', summary: '이름표를 보고 도시락을 찾는 이야기',
    scenes: [['🍱', '점심시간에 수아의 도시락이 보이지 않았어요.', '도시락이 없는 책상 앞의 아이'], ['👀', '수아는 비슷한 도시락 두 개를 발견했어요.', '모양이 비슷한 도시락 두 개'], ['🏷️', '뚜껑 아래의 이름표를 차근차근 확인했어요.', '도시락 이름표를 확인하는 아이'], ['😊', '수아는 자기 도시락을 찾고 친구 것과 바꾸어 놓았어요.', '도시락을 올바르게 바꾸는 두 아이']],
    detail: { kind: 'detail', prompt: '수아는 도시락에서 무엇을 확인했나요?', correct: '이름표', wrong: ['가격표', '날씨표'], evidence: 2, hint: '누구의 물건인지 알려 주는 표시예요.', explanation: '수아는 뚜껑 아래의 이름표를 확인했어요.' },
    thinking: { kind: 'emotion', prompt: '도시락을 찾은 수아의 마음은 어땠을까요?', correct: '안심했어요', wrong: ['계속 걱정했어요', '더 외로웠어요'], evidence: 3, hint: '찾던 물건을 다시 찾았어요.', explanation: '자기 도시락을 찾아서 수아는 안심했을 거예요.' }
  }),
  makeStory({
    id: 'step-windy-hat', title: '바람에 날아간 모자', level: 'step', theme: '협력', cover: '🧢', summary: '친구와 힘을 합치는 이야기',
    scenes: [['🧢', '운동장에서 바람이 불어 준호의 모자가 날아갔어요.', '바람에 날아가는 파란 모자'], ['🌳', '모자는 낮은 나뭇가지에 걸렸어요.', '나뭇가지에 걸린 모자'], ['🪵', '준호는 친구와 긴 막대를 함께 잡았어요.', '긴 막대를 함께 든 두 아이'], ['🙌', '두 사람은 조심히 모자를 내려 웃었어요.', '모자를 되찾고 기뻐하는 두 아이']],
    detail: { kind: 'detail', prompt: '모자는 어디에 걸렸나요?', correct: '나뭇가지', wrong: ['연못 속', '교실 천장'], evidence: 1, hint: '나무에서 옆으로 뻗은 부분이에요.', explanation: '날아간 모자는 낮은 나뭇가지에 걸렸어요.' },
    thinking: { kind: 'cause', prompt: '준호가 친구와 막대를 함께 잡은 까닭은 무엇인가요?', correct: '안전하게 모자를 내리려고', wrong: ['막대를 숨기려고', '바람을 더 세게 만들려고'], evidence: 2, hint: '혼자보다 둘이 하면 더 안전해요.', explanation: '두 친구는 힘을 합쳐 모자를 안전하게 내렸어요.' }
  }),
  makeStory({
    id: 'step-frog-road', title: '개구리의 길 건너기', level: 'step', theme: '생명 존중', cover: '🐸', summary: '작은 생명을 안전하게 돕는 이야기',
    scenes: [['🐸', '비 온 뒤 작은 개구리가 산책로에 나타났어요.', '젖은 산책로 위의 개구리'], ['🚲', '자전거가 오는 것을 본 예린은 멈추라고 손짓했어요.', '자전거에 멈춤 손짓을 하는 아이'], ['🧤', '어른은 장갑을 끼고 개구리를 풀숲 쪽으로 옮겼어요.', '장갑 낀 손으로 개구리를 옮기는 어른'], ['🌿', '개구리는 안전한 풀숲으로 폴짝 뛰어갔어요.', '풀숲으로 뛰는 개구리']],
    detail: { kind: 'detail', prompt: '예린은 자전거를 보고 무엇을 했나요?', correct: '멈추라고 손짓했어요', wrong: ['더 빨리 오라고 했어요', '눈을 감았어요'], evidence: 1, hint: '개구리가 길 위에 있었어요.', explanation: '예린은 개구리를 보호하려고 멈춤 손짓을 했어요.' },
    thinking: { kind: 'title', prompt: '이 이야기와 가장 잘 어울리는 말은 무엇인가요?', correct: '작은 생명을 안전하게', wrong: ['빠른 자전거 경주', '비 오는 날의 소풍'], evidence: 3, hint: '예린과 어른이 누구를 도왔는지 생각해 보세요.', explanation: '모두가 개구리를 안전한 풀숲으로 보내 주었어요.' }
  }),
  makeStory({
    id: 'step-morning-clock', title: '아침 시계와 준비', level: 'step', theme: '생활 습관', cover: '⏰', summary: '순서대로 아침 준비를 하는 이야기',
    scenes: [['⏰', '일곱 시에 알람이 울리자 민재가 일어났어요.', '일곱 시를 가리키는 알람시계'], ['🪥', '민재는 이를 닦고 얼굴을 씻었어요.', '세면대에서 이를 닦는 아이'], ['🥣', '아침밥을 먹은 뒤 가방을 확인했어요.', '아침밥과 열린 책가방'], ['🎒', '준비를 마친 민재는 여유 있게 학교로 갔어요.', '책가방을 메고 학교로 가는 아이']],
    detail: { kind: 'detail', prompt: '민재는 아침밥 뒤에 무엇을 확인했나요?', correct: '가방', wrong: ['냉장고', '신호등'], evidence: 2, hint: '학교에 가져가는 물건이에요.', explanation: '아침밥을 먹은 뒤 가방을 확인했어요.' },
    thinking: { kind: 'cause', prompt: '민재가 여유 있게 학교에 간 까닭은 무엇일까요?', correct: '준비를 순서대로 해서', wrong: ['알람을 끄고 더 자서', '가방을 두고 와서'], evidence: 3, hint: '민재는 일어나서 차례대로 준비했어요.', explanation: '아침 준비를 차근차근 마쳐서 서두르지 않아도 되었어요.' }
  }),
  makeStory({
    id: 'step-paper-airplane', title: '멀리 나는 종이비행기', level: 'step', theme: '도전', cover: '✈️', summary: '실패 뒤 방법을 바꾸는 이야기',
    scenes: [['📄', '채원은 종이비행기를 접어 날렸지만 바로 떨어졌어요.', '바닥에 떨어진 종이비행기'], ['🤔', '채원은 한쪽 날개가 구겨진 것을 발견했어요.', '구겨진 날개를 살펴보는 아이'], ['👐', '날개를 반듯하게 펴고 양쪽 모양을 같게 만들었어요.', '양쪽 날개를 반듯하게 펴는 손'], ['✈️', '다시 날리자 비행기가 교실 끝까지 날아갔어요.', '멀리 날아가는 종이비행기']],
    detail: { kind: 'detail', prompt: '처음 비행기가 떨어진 뒤 채원은 무엇을 발견했나요?', correct: '구겨진 날개', wrong: ['젖은 신발', '빈 물병'], evidence: 1, hint: '비행기의 양옆을 살펴보았어요.', explanation: '채원은 한쪽 날개가 구겨진 것을 발견했어요.' },
    thinking: { kind: 'prediction', prompt: '채원이 날개를 다시 구긴 채 날린다면 어떻게 될까요?', correct: '멀리 날지 못할 거예요', wrong: ['더 반듯하게 날 거예요', '종이가 저절로 펴질 거예요'], evidence: 1, hint: '처음에 구겨진 날개로 날렸을 때를 떠올려 보세요.', explanation: '처음처럼 날개가 구겨져 있으면 공기의 힘을 고르게 받기 어려워요.' }
  }),

  makeStory({
    id: 'explorer-bee-garden', title: '벌이 찾은 꽃밭', level: 'explorer', theme: '자연 관찰', cover: '🐝', summary: '관찰로 벌의 행동을 알아보는 이야기',
    scenes: [['🐝', '과학 시간에 다은이는 창가에서 벌 한 마리를 보았어요.', '창가를 날아가는 벌'], ['🌼', '벌은 노란 꽃 위에 앉아 긴 입으로 꿀을 빨았어요.', '노란 꽃의 꿀을 먹는 벌'], ['🟡', '벌의 다리에는 노란 꽃가루가 묻었어요.', '꽃가루가 묻은 벌의 다리'], ['🌸', '벌은 곧 옆의 분홍 꽃으로 날아갔어요.', '분홍 꽃으로 날아가는 벌'], ['📝', '다은이는 벌이 꽃가루를 옮긴다는 관찰 기록을 남겼어요.', '관찰 내용을 공책에 쓰는 아이']],
    detail: { kind: 'detail', prompt: '벌의 다리에는 무엇이 묻었나요?', correct: '노란 꽃가루', wrong: ['하얀 눈', '푸른 잉크', '작은 모래'], evidence: 2, hint: '벌이 꽃 위에 앉은 뒤 묻었어요.', explanation: '노란 꽃에 앉았던 벌의 다리에 꽃가루가 묻었어요.' },
    thinking: { kind: 'cause', prompt: '다은이가 벌이 꽃가루를 옮긴다고 생각한 까닭은 무엇인가요?', correct: '꽃가루가 묻은 채 다른 꽃으로 가서', wrong: ['벌이 창문을 두드려서', '꽃이 모두 같은 색이어서', '공책이 노란색이어서'], evidence: 3, hint: '벌의 다리와 다음에 간 곳을 함께 생각해 보세요.', explanation: '벌은 꽃가루가 묻은 다리로 다른 꽃에 날아갔어요.' }
  }),
  makeStory({
    id: 'explorer-team-poster', title: '네 사람의 환경 포스터', level: 'explorer', theme: '협력', cover: '🎨', summary: '역할을 나누어 완성하는 이야기',
    scenes: [['📣', '네 친구는 물 절약 포스터를 함께 만들기로 했어요.', '포스터 계획을 이야기하는 네 친구'], ['✏️', '유진은 문구를 쓰고, 태호는 그림 밑그림을 그렸어요.', '글과 밑그림을 맡아 작업하는 친구들'], ['🎨', '나래는 색칠하고, 현우는 필요한 자료를 찾아주었어요.', '색칠과 자료 찾기를 하는 친구들'], ['💬', '그림이 너무 작다는 의견이 나오자 함께 크기를 고쳤어요.', '포스터를 보며 의견을 나누는 친구들'], ['🖼️', '역할을 나누고 의견을 모은 덕분에 포스터를 완성했어요.', '완성한 환경 포스터를 든 친구들']],
    detail: { kind: 'detail', prompt: '현우가 맡은 일은 무엇인가요?', correct: '필요한 자료 찾기', wrong: ['문구 쓰기', '밑그림 그리기', '색칠하기'], evidence: 2, hint: '색칠을 맡은 나래와 함께 소개되었어요.', explanation: '현우는 포스터에 필요한 자료를 찾아주었어요.' },
    thinking: { kind: 'title', prompt: '포스터를 완성하는 데 가장 도움이 된 것은 무엇인가요?', correct: '역할을 나누고 의견을 모은 것', wrong: ['한 사람이 모든 일을 한 것', '서로 말을 하지 않은 것', '작은 그림을 그대로 둔 것'], evidence: 4, hint: '마지막 장면에서 성공한 까닭을 찾아보세요.', explanation: '친구들은 일을 나누고 서로의 의견을 반영해 포스터를 완성했어요.' }
  }),
  makeStory({
    id: 'explorer-ice-cup', title: '얼음컵의 물방울', level: 'explorer', theme: '과학', cover: '🧊', summary: '궁금증을 실험으로 확인하는 이야기',
    scenes: [['🧊', '시원한 얼음물을 담은 컵 바깥에 물방울이 맺혔어요.', '물방울이 맺힌 얼음물 컵'], ['❓', '지호는 컵 안의 물이 새는 것인지 궁금했어요.', '컵을 살펴보며 궁금해하는 아이'], ['🧻', '컵을 닦고 마른 받침 위에 올렸지만 물방울이 다시 생겼어요.', '마른 받침 위 얼음컵'], ['🥛', '빈 차가운 컵에도 바깥쪽 물방울이 생기는 것을 확인했어요.', '바깥에 물방울이 생긴 빈 찬 컵'], ['💡', '지호는 공기 중 수증기가 차가운 컵에서 물이 된다고 알게 되었어요.', '실험 결과를 이해한 아이']],
    detail: { kind: 'vocabulary', prompt: '컵 바깥에 물방울이 “맺혔다”는 말은 무슨 뜻인가요?', correct: '물방울이 생겼어요', wrong: ['컵이 깨졌어요', '물이 모두 얼었어요', '컵이 사라졌어요'], evidence: 0, hint: '컵의 겉면에 전에는 없던 물방울이 보였어요.', explanation: '“맺혔다”는 작은 물방울이 생겨 붙어 있다는 뜻이에요.' },
    thinking: { kind: 'cause', prompt: '컵 바깥에 물방울이 생긴 까닭은 무엇인가요?', correct: '공기 중 수증기가 차가워져서', wrong: ['컵 안의 물이 항상 새어서', '받침이 물을 뿜어서', '얼음이 컵을 뚫어서'], evidence: 4, hint: '빈 차가운 컵에도 물방울이 생겼어요.', explanation: '공기 중 수증기가 차가운 컵 표면에서 물방울로 변했어요.' }
  }),
  makeStory({
    id: 'explorer-bus-seat', title: '버스의 빈자리', level: 'explorer', theme: '배려', cover: '🚌', summary: '상대의 상황을 살피는 이야기',
    scenes: [['🚌', '학교를 마친 세영은 사람이 많은 버스에 탔어요.', '사람이 많은 버스에 탄 아이'], ['💺', '마침 자리가 나서 세영이 앉았어요.', '버스 빈자리에 앉은 아이'], ['🧓', '다음 정류장에서 지팡이를 짚은 할머니가 탔어요.', '지팡이를 짚고 버스에 탄 할머니'], ['👋', '세영은 할머니께 자리를 드리고 손잡이를 잡았어요.', '할머니께 자리를 양보하는 아이'], ['🙂', '할머니의 미소를 본 세영의 마음도 따뜻해졌어요.', '서로 미소 짓는 아이와 할머니']],
    detail: { kind: 'detail', prompt: '세영은 자리를 드린 뒤 무엇을 잡았나요?', correct: '손잡이', wrong: ['지팡이', '우산', '창문'], evidence: 3, hint: '버스에서 서 있을 때 몸을 안전하게 지켜 줘요.', explanation: '세영은 할머니께 자리를 드리고 손잡이를 잡았어요.' },
    thinking: { kind: 'emotion', prompt: '세영의 마음이 따뜻해진 까닭은 무엇일까요?', correct: '도움이 되어 할머니가 미소 지어서', wrong: ['버스가 더 복잡해져서', '자리를 다시 빼앗아서', '정류장을 지나쳐서'], evidence: 4, hint: '마지막 장면에서 두 사람의 표정을 보세요.', explanation: '세영의 배려가 할머니에게 도움이 되었고, 서로 미소 지었어요.' }
  }),
  makeStory({
    id: 'explorer-map-picnic', title: '지도 속 보물 장소', level: 'explorer', theme: '공간', cover: '🗺️', summary: '지도의 표시를 읽는 이야기',
    scenes: [['🗺️', '가족은 공원 안내도에서 별표가 있는 쉼터를 찾기로 했어요.', '별표가 표시된 공원 안내도'], ['🌉', '입구에서 다리를 건너 오른쪽 오솔길로 갔어요.', '다리를 건너 오른쪽 길로 가는 가족'], ['⛲', '분수대가 보이자 지도에서 현재 위치를 다시 확인했어요.', '분수대 옆에서 지도를 보는 가족'], ['🌲', '분수대 뒤 소나무 숲을 지나니 별표 쉼터가 나타났어요.', '소나무 숲 뒤의 쉼터'], ['🥪', '가족은 쉼터에서 준비한 간식을 맛있게 먹었어요.', '쉼터에서 간식을 먹는 가족']],
    detail: { kind: 'detail', prompt: '가족은 다리를 건넌 뒤 어느 쪽으로 갔나요?', correct: '오른쪽 오솔길', wrong: ['왼쪽 큰길', '다리 아래', '공원 밖'], evidence: 1, hint: '방향을 나타내는 말이 나왔어요.', explanation: '다리를 건넌 가족은 오른쪽 오솔길로 갔어요.' },
    thinking: { kind: 'cause', prompt: '분수대에서 지도를 다시 본 까닭은 무엇인가요?', correct: '현재 위치와 길을 확인하려고', wrong: ['지도를 버리려고', '간식을 숨기려고', '분수를 멈추려고'], evidence: 2, hint: '목적지까지 제대로 가고 있는지 알아야 했어요.', explanation: '눈앞의 분수대와 지도를 비교해 현재 위치와 남은 길을 확인했어요.' }
  }),
  makeStory({
    id: 'explorer-apology-vase', title: '깨진 화분과 솔직한 말', level: 'explorer', theme: '책임', cover: '🪴', summary: '실수를 솔직하게 해결하는 이야기',
    scenes: [['⚽', '재민은 거실에서 공을 튕기다 화분을 넘어뜨렸어요.', '넘어진 화분 옆의 공'], ['😟', '흙이 쏟아지자 재민은 잠시 숨기고 싶은 마음이 들었어요.', '쏟아진 흙을 보며 걱정하는 아이'], ['🗣️', '하지만 엄마에게 사실대로 말하고 미안하다고 했어요.', '엄마에게 솔직하게 말하는 아이'], ['🧹', '재민은 엄마와 흙을 치우고 식물을 새 화분에 옮겼어요.', '함께 흙을 치우고 분갈이하는 가족'], ['📏', '앞으로 공놀이는 밖에서 하기로 약속했어요.', '밖에서 공을 들고 약속하는 아이']],
    detail: { kind: 'detail', prompt: '재민은 식물을 어디에 옮겼나요?', correct: '새 화분', wrong: ['장난감 상자', '냉장고', '책가방'], evidence: 3, hint: '깨진 화분 대신 필요한 물건이에요.', explanation: '재민은 엄마와 식물을 새 화분에 옮겼어요.' },
    thinking: { kind: 'cause', prompt: '재민이 문제를 해결할 수 있었던 가장 중요한 행동은 무엇인가요?', correct: '사실대로 말하고 함께 정리한 것', wrong: ['흙을 몰래 숨긴 것', '공을 더 세게 튕긴 것', '아무 말 없이 밖에 나간 것'], evidence: 2, hint: '실수한 뒤 재민이 엄마에게 한 일을 생각해 보세요.', explanation: '솔직히 말하고 책임 있게 정리해서 문제를 해결했어요.' }
  }),

  makeStory({
    id: 'thinker-stream-trash', title: '개울을 막은 비닐', level: 'thinker', theme: '환경', cover: '🌊', summary: '원인을 관찰하고 함께 해결하는 이야기',
    scenes: [['🌧️', '밤새 비가 온 뒤 학교 옆 개울물이 평소보다 느리게 흘렀다.', '비 온 뒤 물이 느리게 흐르는 개울'], ['🔎', '환경 동아리 아이들은 물길 가장자리에 나뭇잎과 비닐이 엉킨 것을 발견했다.', '물길에 엉킨 나뭇잎과 비닐'], ['📸', '아이들은 위험하게 물에 들어가지 않고 선생님께 사진과 위치를 알렸다.', '개울을 촬영해 선생님께 알리는 아이들'], ['🧤', '안전 장비를 갖춘 관리 직원이 막힌 쓰레기를 걷어 냈다.', '안전 장비로 쓰레기를 치우는 직원'], ['💧', '막힘이 사라지자 개울물은 다시 자연스럽게 흘렀다.', '다시 흐르는 맑은 개울'], ['🪧', '아이들은 비 오는 날 쓰레기가 물길을 막을 수 있다는 안내판을 만들었다.', '개울 보호 안내판을 세운 아이들']],
    detail: { kind: 'detail', prompt: '아이들이 직접 물에 들어가지 않은 까닭은 무엇인가요?', correct: '안전을 지키기 위해서', wrong: ['사진기가 없어서', '비닐이 너무 예뻐서', '개울이 완전히 말라서'], evidence: 2, hint: '비 온 뒤의 개울은 위험할 수 있어요.', explanation: '아이들은 안전을 지키며 사진과 위치를 어른에게 알렸어요.' },
    thinking: { kind: 'cause', prompt: '개울물이 다시 자연스럽게 흐르게 된 직접적인 까닭은 무엇인가요?', correct: '물길을 막은 쓰레기를 걷어 내서', wrong: ['안내판의 글씨를 크게 써서', '사진을 여러 장 찍어서', '아이들이 학교로 돌아가서'], evidence: 4, hint: '물이 달라지기 직전에 일어난 일을 찾으세요.', explanation: '관리 직원이 막힌 쓰레기를 제거하자 물길이 열렸어요.' }
  }),
  makeStory({
    id: 'thinker-fair-rules', title: '새로 만든 피구 규칙', level: 'thinker', theme: '공정', cover: '🏐', summary: '모두가 참여하는 규칙을 만드는 이야기',
    scenes: [['🏐', '반 친구들은 점심시간마다 피구를 했지만 공을 잘 던지는 몇 명만 오래 남았다.', '몇몇 아이만 남아 피구하는 운동장'], ['🙁', '공을 피하기 어려운 친구들은 게임에 들어가기를 망설였다.', '피구 참여를 망설이는 아이들'], ['💬', '학급회의에서 누구나 즐길 방법을 한 가지씩 제안했다.', '둥글게 앉아 의견을 내는 학급회의'], ['📋', '친구들은 부드러운 공을 쓰고, 맞아도 한 번 다시 들어오는 규칙을 시험했다.', '새 규칙으로 피구를 시험하는 아이들'], ['🔄', '경기가 너무 길어지자 다시 들어오는 기회를 한 번으로 정했다.', '규칙표를 고치는 아이들'], ['🙌', '규칙을 고친 뒤 더 많은 친구가 끝까지 즐겁게 참여했다.', '모두 함께 피구를 즐기는 반 친구들']],
    detail: { kind: 'detail', prompt: '시험한 규칙에서 맞은 친구에게 준 기회는 무엇인가요?', correct: '한 번 다시 들어오기', wrong: ['공을 두 개 던지기', '바로 경기를 끝내기', '혼자 심판하기'], evidence: 3, hint: '탈락한 뒤 다시 참여할 방법이었어요.', explanation: '맞은 친구도 한 번은 경기에 다시 들어올 수 있게 했어요.' },
    thinking: { kind: 'cause', prompt: '규칙을 고친 결과로 가장 알맞은 것은 무엇인가요?', correct: '더 많은 친구가 즐겁게 참여했다', wrong: ['공을 잘 던지는 친구만 남았다', '아무도 피구를 하지 않았다', '경기가 시작되자마자 끝났다'], evidence: 5, hint: '마지막 장면에서 참여한 사람들을 살펴보세요.', explanation: '친구들의 어려움을 반영해 규칙을 고치자 참여가 늘었어요.' }
  }),
  makeStory({
    id: 'thinker-solar-oven', title: '햇빛으로 익힌 간식', level: 'thinker', theme: '과학 탐구', cover: '☀️', summary: '조건을 비교하며 실험하는 이야기',
    scenes: [['📦', '과학 모둠은 상자 안에 은박지를 붙여 햇빛 오븐을 만들었다.', '은박지를 붙인 상자 오븐'], ['🍫', '같은 크기의 과자와 초콜릿을 두 상자에 똑같이 넣었다.', '두 상자에 놓인 같은 간식'], ['☀️', '한 상자는 햇빛이 잘 드는 곳에, 다른 상자는 그늘에 두었다.', '햇빛과 그늘에 각각 놓인 상자'], ['🌡️', '십 분마다 두 상자의 온도를 재어 표에 기록했다.', '온도를 재고 표에 기록하는 아이들'], ['🍪', '햇빛에 둔 상자의 초콜릿이 먼저 부드럽게 녹았다.', '햇빛 상자에서 녹은 초콜릿'], ['📝', '모둠은 햇빛이 상자 안의 온도를 높였다는 결론을 적었다.', '실험 결론을 쓰는 모둠']],
    detail: { kind: 'detail', prompt: '두 상자의 조건을 다르게 한 것은 무엇인가요?', correct: '햇빛이 드는 장소', wrong: ['초콜릿의 크기', '과자의 종류', '상자의 안쪽 재료'], evidence: 2, hint: '한 상자는 밝은 곳, 다른 상자는 어두운 곳에 두었어요.', explanation: '두 상자는 햇빛과 그늘이라는 장소 조건만 다르게 했어요.' },
    thinking: { kind: 'cause', prompt: '햇빛이 온도를 높였다는 결론을 뒷받침하는 결과는 무엇인가요?', correct: '햇빛 상자의 초콜릿이 먼저 녹았다', wrong: ['두 상자에 같은 과자를 넣었다', '은박지를 상자에 붙였다', '아이들이 표를 그렸다'], evidence: 4, hint: '햇빛 상자에서 실제로 달라진 것을 찾으세요.', explanation: '햇빛에 둔 상자의 온도가 더 올라 초콜릿이 먼저 녹았어요.' }
  }),
  makeStory({
    id: 'thinker-rumor-message', title: '달라진 전달 쪽지', level: 'thinker', theme: '의사소통', cover: '📝', summary: '정보를 확인하는 습관을 배우는 이야기',
    scenes: [['📝', '민지는 미술 준비물이 색연필이라는 선생님의 쪽지를 받았다.', '색연필 준비물이 적힌 쪽지'], ['💬', '친구에게 말로 전하는 동안 누군가 준비물을 물감이라고 잘못 들었다.', '준비물을 말로 전달하는 아이들'], ['🎨', '다음 날 몇몇 친구가 물감만 가져와 수업 준비가 늦어졌다.', '물감을 가져와 당황한 아이들'], ['🔍', '민지는 원래 쪽지를 다시 확인해 정확한 내용을 알려 주었다.', '원래 쪽지를 확인하는 아이'], ['📷', '반 친구들은 중요한 안내를 글이나 사진으로 함께 확인하기로 했다.', '안내 쪽지를 사진으로 공유하는 반'], ['✅', '그 뒤에는 준비물을 잘못 가져오는 일이 크게 줄었다.', '준비물을 정확히 챙긴 아이들']],
    detail: { kind: 'detail', prompt: '선생님의 원래 쪽지에 적힌 준비물은 무엇인가요?', correct: '색연필', wrong: ['물감', '찰흙', '붓만'], evidence: 0, hint: '이야기의 첫 장면에 정확한 내용이 있어요.', explanation: '원래 안내된 준비물은 색연필이었어요.' },
    thinking: { kind: 'cause', prompt: '준비물 실수가 줄어든 까닭은 무엇인가요?', correct: '중요한 안내를 글이나 사진으로 확인해서', wrong: ['준비물을 아무렇게나 골라서', '친구에게 더 빨리 말해서', '쪽지를 버려서'], evidence: 4, hint: '친구들이 새로 정한 확인 방법을 찾으세요.', explanation: '기억에만 기대지 않고 원문을 확인하자 전달 오류가 줄었어요.' }
  }),
  makeStory({
    id: 'thinker-old-tree', title: '운동장의 오래된 나무', level: 'thinker', theme: '토론', cover: '🌳', summary: '여러 의견과 근거를 비교하는 이야기',
    scenes: [['🌳', '학교는 운동장 공사를 앞두고 오래된 느티나무를 옮길지 고민했다.', '운동장 가운데의 큰 느티나무'], ['⚽', '일부 학생은 운동 공간을 넓히기 위해 나무를 옮기자고 말했다.', '넓은 운동장을 가리키는 학생들'], ['🐦', '다른 학생은 나무가 그늘을 만들고 새들의 집이 된다고 설명했다.', '나무 그늘과 가지 위 새 둥지'], ['📏', '모두는 나무 주변과 필요한 운동 공간의 크기를 직접 재었다.', '줄자로 운동장을 측정하는 학생들'], ['🗺️', '측정 결과를 바탕으로 나무를 남기고 달리기 길을 휘어 설계했다.', '나무를 피해 휘어진 달리기 길 설계도'], ['🌿', '새 운동장은 나무 그늘과 안전한 달리기 공간을 모두 갖추게 되었다.', '나무와 달리기 길이 함께 있는 운동장']],
    detail: { kind: 'detail', prompt: '학생들은 결정을 내리기 전에 무엇을 직접 했나요?', correct: '공간의 크기를 재었다', wrong: ['나무를 바로 베었다', '새를 모두 옮겼다', '운동장을 닫았다'], evidence: 3, hint: '의견만 말하지 않고 실제 자료를 모았어요.', explanation: '나무 주변과 운동 공간의 크기를 재어 판단할 자료를 만들었어요.' },
    thinking: { kind: 'title', prompt: '학생들의 해결 방법을 가장 잘 설명한 것은 무엇인가요?', correct: '두 필요를 함께 살린 설계', wrong: ['한쪽 의견만 따른 결정', '자료 없이 내린 결정', '공사를 포기한 선택'], evidence: 4, hint: '나무와 달리기 길이 어떻게 되었는지 보세요.', explanation: '나무를 보존하면서 달리기 공간도 확보하는 방법을 찾았어요.' }
  }),
  makeStory({
    id: 'thinker-power-outage', title: '정전된 아파트의 저녁', level: 'thinker', theme: '안전', cover: '🔦', summary: '침착하게 안전 수칙을 지키는 이야기',
    scenes: [['🌃', '저녁 식사 중 갑자기 아파트의 불이 모두 꺼졌다.', '불이 꺼진 어두운 아파트'], ['🔦', '아빠는 촛불 대신 건전지 손전등을 켰다.', '건전지 손전등을 켜는 가족'], ['📱', '가족은 관리실 안내를 확인하고 승강기를 이용하지 않았다.', '휴대전화로 관리실 안내를 보는 가족'], ['🚪', '복도에서 혼자 있던 이웃 아이를 발견해 보호자와 연락하도록 도왔다.', '복도에서 이웃 아이를 돕는 가족'], ['⚡', '전기가 돌아온 뒤 사용 중이던 전열 기구의 전원을 다시 확인했다.', '전열 기구 전원을 확인하는 어른'], ['🧰', '가족은 손전등과 여분 건전지를 비상 가방에 넣어 두었다.', '손전등이 든 비상 가방']],
    detail: { kind: 'detail', prompt: '가족이 승강기를 이용하지 않은 까닭은 무엇인가요?', correct: '정전 중 멈출 수 있어서', wrong: ['층수가 너무 낮아서', '손전등이 밝아서', '관리실이 비어 있어서'], evidence: 2, hint: '전기가 없을 때 움직이는 기계를 생각해 보세요.', explanation: '정전 중 승강기가 멈추면 갇힐 수 있어 이용하지 않았어요.' },
    thinking: { kind: 'cause', prompt: '가족이 비상 가방을 준비한 이유로 가장 알맞은 것은 무엇인가요?', correct: '다음 정전에도 침착하게 대비하려고', wrong: ['손전등을 다시는 쓰지 않으려고', '승강기를 더 자주 타려고', '방을 더 어둡게 만들려고'], evidence: 5, hint: '마지막 행동이 다음 상황에 어떤 도움을 줄지 생각해 보세요.', explanation: '필요한 물건을 미리 모아 두면 다음 정전에도 안전하게 대응할 수 있어요.' }
  })
];

export const storiesByLevel = (level: StoryLevel): Story[] => stories.filter((story) => story.level === level);
export const storyById = (id: string): Story | undefined => stories.find((story) => story.id === id);

export const validateStories = (values: readonly Story[] = stories): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  values.forEach((story) => {
    if (ids.has(story.id)) errors.push(`중복 이야기 ID: ${story.id}`);
    ids.add(story.id);
    if (!STORY_LEVELS.includes(story.level)) errors.push(`${story.id}: 잘못된 단계`);
    const expectedScenes = story.level === 'sprout' ? 3 : story.level === 'step' ? 4 : story.level === 'explorer' ? 5 : 6;
    if (story.scenes.length !== expectedScenes) errors.push(`${story.id}: 장면 수 ${story.scenes.length}/${expectedScenes}`);
    if (story.activities.length !== 3) errors.push(`${story.id}: 활동은 3개여야 함`);
    const sceneIds = new Set(story.scenes.map((scene) => scene.id));
    if (sceneIds.size !== story.scenes.length) errors.push(`${story.id}: 장면 ID 중복`);
    story.scenes.forEach((scene) => {
      if (!scene.text.trim() || !scene.alt.trim() || !scene.illustration.trim()) errors.push(`${scene.id}: 장면 내용 누락`);
    });
    story.activities.forEach((activity) => {
      if (activity.type === 'sequence') {
        if (activity.sceneIds.length !== story.scenes.length || activity.sceneIds.some((id) => !sceneIds.has(id))) {
          errors.push(`${activity.id}: 순서 장면 오류`);
        }
      } else {
        if (!activity.options.some((option) => option.id === activity.correctOptionId)) errors.push(`${activity.id}: 정답 보기 누락`);
        if (!sceneIds.has(activity.evidenceSceneId)) errors.push(`${activity.id}: 근거 장면 누락`);
        if (new Set(activity.options.map((option) => option.label)).size !== activity.options.length) errors.push(`${activity.id}: 보기 중복`);
        if (activity.options.length < 2 || activity.options.length > 4) errors.push(`${activity.id}: 보기 수 오류`);
      }
    });
  });
  STORY_LEVELS.forEach((level) => {
    if (values.filter((story) => story.level === level).length !== 6) errors.push(`${level}: 이야기 6편 필요`);
  });
  return errors;
};
