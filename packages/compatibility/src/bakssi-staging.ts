import {resolveAsset} from '@knolstory/asset-registry';
import {
  type StageActorEntry,
  type StageComposition,
  type StoryAudio,
  type StoryCharacter,
  type StoryMusicCue,
  type StoryPresentation,
} from '@knolstory/story-domain';

const cast = {
  bakssi: ['박씨', '피화당을 꾸리고 사람들을 지킨다.'],
  gyehwa: ['계화', '박씨와 피화당을 돌본다.'],
  sibaek: ['이시백', '박씨의 남편이며 이득춘의 아들이다.'],
  deukchun: ['이득춘', '이시백의 아버지이다.'],
  'park-cheosa': ['박 처사', '금강산에 사는 박씨의 아버지이다.'],
  gihongdae: ['기홍대', '청에서 온 인물이다.'],
  yonguldae: ['용울대', '피화당으로 들어오려는 청군 장수이다.'],
  yonggoldae: ['용골대', '용울대의 형이다.'],
  jajom: ['김자점', '조정에서 박씨의 경고를 물리친 대신이다.'],
  'sister-older': ['언니', '동생의 신발을 돌려주려 하는 아이다.'],
  'sister-young': ['노란 댕기 아이', '피화당을 아는 어린 동생이다.'],
  seamstress: ['바느질댁', '피화당 이웃으로, 바느질로 살림을 꾸린다.'],
  grandmother: ['우물집 할머니', '우물가에서 이웃과 지내고 큰 국자를 빌려준다.'],
  soldier: ['다친 병사', '전란 중 피화당을 찾은 청군 병사이다.'],
  horse: ['말', '박씨와 계화가 돌본 말이다.'],
  boy: ['아이', '바느질댁에서 온 아이다.'],
  merchant: ['곡식 장수', '장에서 겨울 양식을 판다.'],
  potter: ['사기장이', '박씨가 연적을 빚도록 돕는다.'],
  'straw-weaver': ['짚 엮는 할머니', '이엉을 엮는 솜씨가 좋다.'],
  'gyehwa-mother': ['계화 어머니', '이웃 집의 다락에 쌀이 얼마나 들어가는지 안다.'],
  mother: ['아기 어머니', '우물 곁에 사는 이웃이다.'],
  soli: ['솔이', '전란 중에 파란 끈 묶인 물동이를 들고 어머니를 찾는다.'],
  carter: ['수레꾼', '쌀을 날랐던 이웃으로 가마 앞에서 피란민을 돕는다.'],
  envoy: ['사신', '먼 길에 함께 갈 말을 찾는다.'],
  'neighbor-child': ['이웃 아이', '아침마다 우물에 나오며 이웃을 알아간다.'],
} as const;

type CastMember = keyof typeof cast;
type Actor = CastMember | 'bakssi-revealed' | 'bakssi-wedding' | 'sibaek-wedding';
type Stage = 'wedding-night' | 'mountain-road' | 'main-hall' | 'courtyard-day' | 'courtyard-night'
  | 'stable-day' | 'market-day' | 'riverside-day' | 'pottery-day' | 'exam-day' | 'court-day'
  | 'courtyard-rain' | 'courtyard-snow' | 'lane-snow' | 'kiln-snow' | 'well-day'
  | 'well-snow' | 'courtyard-spring';
type SceneSpan = readonly [cuts: string, location: Stage, ...actors: Actor[]];

const baseActor: Partial<Record<Actor, CastMember>> = {
  'bakssi-wedding': 'bakssi',
  'bakssi-revealed': 'bakssi',
  'sibaek-wedding': 'sibaek',
};
const actorId = (actor: Actor) => `bakssi-character-${actor}`;
const characterKey = (actor: CastMember) => `bakssi.${actor}`;
const memberOf = (actor: Actor): CastMember => baseActor[actor] ?? actor as CastMember;

export function bakssiCharacterCatalog(): StoryCharacter[] {
  return (Object.entries(cast) as [CastMember, typeof cast[CastMember]][]).map(([actor, [name, description]]) => ({
    id: characterKey(actor),
    name,
    description,
    role: actor === 'bakssi' ? '주인공' : '',
    defaultImageId: actorId(actor),
  }));
}

// Spans follow the authored action so each branch owns its cast and weather.
const scenes: readonly SceneSpan[] = [
  ['O01–O03', 'main-hall', 'park-cheosa', 'deukchun'],
  ['O04', 'mountain-road'],
  ['O05–O09', 'wedding-night', 'bakssi-wedding', 'sibaek-wedding'],
  ['O10', 'wedding-night', 'bakssi-wedding'],
  ['O11–O12', 'main-hall', 'bakssi', 'deukchun'],
  ['O13–O16', 'courtyard-day', 'bakssi', 'gyehwa'],
  ['O17–O22', 'main-hall', 'bakssi', 'deukchun'],
  ['O23–O25', 'market-day', 'bakssi', 'horse'],
  ['O26–O27', 'stable-day', 'gyehwa', 'horse'],
  ['O28', 'mountain-road', 'gyehwa', 'horse'],
  ['O29–O31', 'mountain-road', 'gyehwa', 'horse', 'envoy'],
  ['O32', 'stable-day', 'bakssi', 'horse'],
  ['O33', 'stable-day', 'gyehwa'],
  ['O34–O37', 'courtyard-night', 'bakssi', 'deukchun'],
  ['O38–O42', 'exam-day', 'sibaek'],
  ['O43–O45', 'main-hall', 'deukchun', 'sibaek'],
  ['O46', 'courtyard-night', 'sibaek'],
  ['O47–O48', 'courtyard-day', 'bakssi', 'gyehwa'],
  ['O49', 'mountain-road', 'bakssi'],
  ['O50–O51', 'courtyard-night', 'bakssi', 'park-cheosa'],
  ['O52', 'courtyard-night', 'bakssi-revealed', 'park-cheosa'],
  ['O53–O54', 'courtyard-day', 'bakssi-revealed', 'gyehwa'],
  ['O55–O56', 'courtyard-day', 'bakssi-revealed', 'sibaek'],
  ['O57', 'courtyard-night', 'bakssi-revealed', 'sibaek'],
  ['O58–O61', 'courtyard-night', 'gyehwa', 'gihongdae'],
  ['O62–O65', 'courtyard-night', 'bakssi-revealed', 'gihongdae'],
  ['O66–O68', 'courtyard-night', 'bakssi-revealed', 'sibaek'],
  ['O69–O71', 'court-day', 'sibaek', 'jajom'],
  ['O72', 'lane-snow'],
  ['O73–O74', 'courtyard-snow', 'gyehwa', 'sister-older'],
  ['O75–O76', 'courtyard-snow', 'yonguldae', 'horse'],
  ['O77–O78', 'courtyard-snow', 'bakssi-revealed', 'sibaek'],
  ['O79–O80', 'courtyard-snow', 'bakssi-revealed', 'yonguldae'],
  ['O81–O83', 'courtyard-snow', 'bakssi-revealed', 'yonggoldae'],
  ['O84', 'courtyard-snow', 'sister-young', 'sister-older'],
  ['O85–O86', 'courtyard-snow', 'bakssi-revealed', 'gyehwa'],
  ['O87–O88', 'courtyard-snow', 'bakssi-revealed', 'sibaek'],
  ['O89–O90', 'courtyard-spring', 'bakssi-revealed', 'gyehwa'],
  ['O91', 'courtyard-spring', 'bakssi-revealed', 'sister-older', 'sister-young'],

  ['C01', 'mountain-road', 'sibaek-wedding', 'horse'],
  ['C02–C06', 'wedding-night', 'bakssi-wedding', 'sibaek-wedding'],
  ['C07', 'wedding-night', 'bakssi-wedding'],
  ['C08–C09', 'main-hall', 'bakssi', 'deukchun'],
  ['C10–C13', 'courtyard-day', 'bakssi', 'gyehwa'],
  ['C14–C18', 'courtyard-night', 'bakssi', 'deukchun'],
  ['C19–C21', 'courtyard-day', 'bakssi', 'deukchun'],
  ['C22–C23', 'market-day', 'bakssi', 'gyehwa'],
  ['C24–C26', 'market-day', 'bakssi', 'horse'],
  ['C27–C28', 'stable-day', 'gyehwa', 'horse'],
  ['C29', 'mountain-road', 'gyehwa', 'horse'],
  ['C30–C34', 'mountain-road', 'bakssi', 'horse', 'envoy'],
  ['C35–C36', 'stable-day', 'gyehwa'],
  ['C37', 'market-day', 'bakssi', 'gyehwa'],
  ['G01–G04', 'market-day', 'bakssi', 'gyehwa'],
  ['G05–G07', 'courtyard-day', 'bakssi', 'gyehwa'],
  ['G08–G13', 'courtyard-day', 'bakssi', 'gyehwa-mother', 'gyehwa'],
  ['G14–G16', 'stable-day', 'bakssi', 'gyehwa'],
  ['H01–H03', 'market-day', 'bakssi', 'gyehwa'],
  ['H04–H10', 'stable-day', 'bakssi', 'straw-weaver', 'gyehwa'],
  ['H11–H16', 'courtyard-day', 'bakssi', 'gyehwa'],
  ['D01–D03', 'stable-day', 'bakssi', 'gyehwa'],
  ['D04', 'riverside-day'],
  ['D05–D08', 'courtyard-night', 'bakssi', 'gyehwa'],
  ['D09–D15', 'pottery-day', 'bakssi', 'potter'],
  ['D16–D18', 'courtyard-day', 'bakssi', 'deukchun'],
  ['D19–D23', 'exam-day', 'sibaek'],
  ['D24–D26', 'main-hall', 'deukchun', 'sibaek'],
  ['D27–D28', 'courtyard-night', 'sibaek'],
  ['D29–D30', 'courtyard-day', 'bakssi', 'gyehwa'],
  ['K01–K04', 'courtyard-night', 'bakssi', 'gyehwa'],
  ['D31–D36', 'courtyard-night', 'bakssi', 'park-cheosa'],

  ['A01–A03', 'courtyard-night', 'bakssi-revealed', 'park-cheosa'],
  ['A04–A08', 'courtyard-day', 'bakssi-revealed', 'gyehwa'],
  ['A09–A14', 'courtyard-day', 'bakssi-revealed', 'sibaek'],
  ['A15–A18', 'stable-day', 'bakssi-revealed', 'sibaek'],
  ['A19', 'courtyard-day'],
  ['A20', 'courtyard-night', 'gyehwa'],
  ['A21–A24', 'courtyard-night', 'bakssi-revealed', 'gihongdae'],
  ['Q01–Q03', 'courtyard-night', 'bakssi-revealed', 'gihongdae'],
  ['A25–A27', 'courtyard-night', 'bakssi-revealed', 'gihongdae'],
  ['A28', 'courtyard-night', 'bakssi-revealed'],
  ['A29–A33', 'courtyard-night', 'bakssi-revealed', 'gihongdae'],
  ['A34–A37', 'courtyard-night', 'bakssi-revealed', 'sibaek'],
  ['A38–A40', 'court-day', 'sibaek', 'jajom'],
  ['A41–A43', 'courtyard-day', 'bakssi-revealed', 'sibaek'],
  ['M01–M03', 'courtyard-day', 'bakssi-revealed', 'gyehwa'],
  ['M04–M09', 'courtyard-day', 'bakssi-revealed', 'sister-older'],
  ['M10–M15', 'courtyard-day', 'bakssi-revealed', 'sister-older'],
  ['M16–M18', 'courtyard-day', 'gyehwa', 'sister-young', 'sister-older'],
  ['M19–M21', 'courtyard-day', 'bakssi-revealed', 'sibaek'],
  ['M22–M25', 'courtyard-day', 'sister-older', 'sister-young'],
  ['A44', 'lane-snow'],
  ['A45–A46', 'courtyard-snow', 'gyehwa'],
  ['A47–A50', 'courtyard-snow', 'bakssi-revealed', 'sister-young'],
  ['A51–A52', 'courtyard-snow', 'gyehwa', 'sibaek'],
  ['A53–A54', 'courtyard-snow', 'yonguldae', 'horse'],
  ['A55–A57', 'courtyard-snow', 'bakssi-revealed', 'gyehwa'],
  ['X01–X02', 'courtyard-snow', 'bakssi-revealed', 'gyehwa'],
  ['X03–X06', 'courtyard-snow', 'bakssi-revealed', 'yonguldae'],
  ['X07', 'courtyard-snow'],
  ['X08–X09', 'courtyard-snow', 'gyehwa', 'sister-young'],
  ['X10–X17', 'courtyard-snow', 'bakssi-revealed', 'yonggoldae'],
  ['X18–X20', 'courtyard-snow', 'bakssi-revealed', 'sibaek'],
  ['X21–X24', 'courtyard-snow', 'sister-older', 'sister-young'],
  ['X25–X29', 'courtyard-snow', 'bakssi-revealed', 'sibaek'],
  ['X30–X31', 'courtyard-spring', 'bakssi-revealed', 'gyehwa'],
  ['X32', 'courtyard-spring', 'bakssi-revealed', 'sister-older', 'sister-young'],
  ['Y01–Y05', 'courtyard-snow', 'bakssi-revealed', 'gyehwa', 'sister-young'],
  ['Y06–Y08', 'lane-snow', 'bakssi-revealed', 'yonguldae'],
  ['Y09–Y10', 'kiln-snow', 'bakssi-revealed', 'sibaek'],
  ['Y11–Y14', 'kiln-snow', 'sister-older', 'sister-young'],
  ['Y15–Y18', 'kiln-snow', 'bakssi-revealed', 'sibaek'],
  ['Y19–Y22', 'kiln-snow', 'bakssi-revealed', 'carter', 'gyehwa'],
  ['Y23–Y24', 'courtyard-snow', 'yonguldae', 'yonggoldae'],
  ['Y25–Y26', 'courtyard-snow', 'bakssi-revealed', 'gyehwa'],
  ['Y27–Y30', 'courtyard-snow', 'sibaek', 'sister-older', 'carter'],
  ['Y31–Y32', 'courtyard-snow', 'bakssi-revealed', 'sibaek'],
  ['Y33', 'courtyard-spring', 'sister-older', 'sister-young'],

  ['B01–B03', 'courtyard-night', 'bakssi', 'park-cheosa'],
  ['B04–B08', 'courtyard-day', 'bakssi', 'sibaek'],
  ['B09–B13', 'stable-day', 'bakssi', 'boy'],
  ['B14–B16', 'stable-day', 'bakssi', 'boy', 'sibaek'],
  ['B17–B20', 'courtyard-day', 'bakssi', 'seamstress'],
  ['B21–B23', 'courtyard-day', 'bakssi', 'grandmother', 'gyehwa'],
  ['B24–B27', 'courtyard-day', 'bakssi', 'grandmother'],
  ['B28–B30', 'courtyard-day', 'sibaek', 'grandmother'],
  ['B31–B32', 'courtyard-rain', 'bakssi', 'seamstress'],
  ['B33–B36', 'courtyard-rain', 'bakssi', 'gihongdae', 'seamstress'],
  ['B37–B41', 'courtyard-rain', 'bakssi', 'gihongdae'],
  ['B42–B43', 'courtyard-rain', 'bakssi', 'gyehwa'],
  ['B44', 'court-day', 'sibaek', 'jajom'],
  ['N01–N07', 'well-day', 'bakssi', 'grandmother'],
  ['N08–N12', 'courtyard-day', 'bakssi', 'mother'],
  ['N13–N24', 'well-day', 'gyehwa', 'grandmother'],
  ['B45', 'lane-snow'],
  ['B46–B49', 'courtyard-snow', 'bakssi', 'seamstress'],
  ['B50–B51', 'courtyard-snow', 'sibaek', 'boy'],
  ['B52–B54', 'courtyard-snow', 'grandmother', 'soldier'],
  ['B55–B59', 'courtyard-snow', 'bakssi', 'yonguldae'],
  ['B60–B63', 'courtyard-snow', 'bakssi', 'yonggoldae', 'gihongdae'],
  ['U01–U04', 'courtyard-snow', 'bakssi', 'soldier'],
  ['U05–U08', 'courtyard-snow', 'gihongdae', 'soldier'],
  ['U09–U13', 'courtyard-snow', 'gyehwa', 'seamstress'],
  ['U14–U17', 'lane-snow', 'seamstress', 'yonguldae'],
  ['U18–U21', 'courtyard-snow', 'bakssi', 'yonggoldae'],
  ['U22–U24', 'courtyard-snow', 'grandmother', 'gyehwa'],
  ['U25–U30', 'courtyard-snow', 'sibaek', 'gyehwa'],
  ['U31–U32', 'courtyard-snow', 'bakssi', 'gyehwa', 'sibaek'],
  ['V01–V02', 'courtyard-snow', 'bakssi', 'gihongdae'],
  ['V03–V08', 'lane-snow', 'bakssi', 'gihongdae'],
  ['V09–V14', 'lane-snow', 'bakssi', 'soli', 'soldier'],
  ['V15–V18', 'lane-snow', 'bakssi', 'yonguldae', 'gihongdae'],
  ['V19–V23', 'well-snow', 'bakssi', 'grandmother', 'gihongdae'],
  ['V24–V25', 'lane-snow', 'bakssi', 'gihongdae'],
  ['V26–V28', 'lane-snow', 'soli', 'mother'],
  ['V29–V31', 'lane-snow', 'bakssi', 'yonggoldae'],
  ['V32–V33', 'lane-snow', 'bakssi', 'gihongdae'],
  ['V34–V37', 'courtyard-spring', 'bakssi', 'sibaek'],
];

const sceneByCut = new Map<string, SceneSpan>();
for (const scene of scenes) {
  const [span] = scene;
  const [first, last = first] = span.split('–');
  for (let number = Number(first.slice(1)); number <= Number(last.slice(1)); number++) {
    const id = first[0] + String(number).padStart(2, '0');
    if (sceneByCut.has(id)) throw new Error(`박씨전 ${id}: 무대가 중복되어 있어요.`);
    sceneByCut.set(id, scene);
  }
}

const spokenRoles: ReadonlyMap<string, CastMember> = new Map<string, CastMember>([
  ...Object.entries(cast).map(([actor, [name]]): [string, CastMember] => [name, actor as CastMember]),
  ['동생', 'sister-young'],
  ['소녀', 'soli'],
  ['솔이 어머니', 'mother'],
]);

// The same character key stays present when the face or wedding outfit changes.
function poseFor(actor: Actor, cut: string): StageActorEntry {
  const member = memberOf(actor);
  const key = characterKey(member);
  const motion = cut === 'O08' && member === 'sibaek' ? {type: 'exit-right', durationMs: 1400} as const : undefined;
  const expression = expressionAtCut[cut];
  const defaultImage = actorId(actor);
  const expressionImage = expression?.actor === member && expression.emotion
    ? resolveAsset(`${defaultImage}-${expression.emotion}`)
    : undefined;
  const assetId = expressionImage?.type === 'character' ? expressionImage.id : defaultImage;
  return {key, characterKey: key, assetId, ...(motion ? {motion} : {})};
}

const score = (asset: string, volume = .28): StoryMusicCue => ({
  action: 'play', assetId: `audio:music:score-${asset}`, volume, loop: true, fadeInMs: 650, fadeOutMs: 650,
});
const music: Readonly<Record<string, StoryMusicCue>> = {
  O01: score('calm'), O10: score('loss', .21), O13: score('warmth'), O38: score('curiosity'),
  O48: score('mystery'), O53: score('warmth'), O58: score('tension'), O72: score('loss'),
  O76: score('tension'), O85: score('calm'), O89: score('resolve'),
  C01: score('calm'), C07: score('loss', .21), C11: score('warmth'), D01: score('calm'),
  D19: score('curiosity'), K01: score('mystery'), A04: score('warmth'), A20: score('tension'),
  M01: score('warmth'), A44: score('loss'), A53: score('tension'), X25: score('calm'),
  X30: score('resolve'), Y25: score('loss', .22), Y33: score('resolve'),
  B04: score('warmth'), B32: score('mystery'), B44: score('loss'), N13: score('calm'),
  B45: score('loss'), B55: score('tension'), U25: score('resolve'), V27: score('warmth'), V34: score('resolve'),
};
const ambience: Readonly<Record<string, StoryMusicCue>> = {
  B32: {action: 'play', assetId: 'audio:music:ambience-rain', volume: .25, loop: true, fadeInMs: 500, endLineId: 'bakssi-b44'},
};
const sound: Readonly<Record<string, string>> = {
  O07: 'cloth', O10: 'door', O50: 'door', O61: 'cloth', O63: 'crack', O75: 'steps',
  C07: 'door', C28: 'water', D31: 'door', A25: 'steps', Q03: 'crack', A53: 'steps',
  Y19: 'cloth', B04: 'door', B36: 'cloth', N13: 'water', V06: 'door', V24: 'steps',
};

const transitions: Readonly<Record<string, StoryPresentation['transition']>> = {
  O04: {type: 'dissolve', durationMs: 520},
  O05: {type: 'fade-black', durationMs: 740},
  O49: {type: 'dissolve', durationMs: 600},
  O52: {type: 'white-fade', durationMs: 660},
  O72: {type: 'fade-black', durationMs: 820},
  O89: {type: 'dissolve', durationMs: 800},
  C02: {type: 'fade-black', durationMs: 700},
  D06: {type: 'dissolve', durationMs: 520},
  A01: {type: 'white-fade', durationMs: 720},
  A19: {type: 'dissolve', durationMs: 690},
  A44: {type: 'fade-black', durationMs: 800},
  X30: {type: 'dissolve', durationMs: 800},
  Y33: {type: 'dissolve', durationMs: 820},
  B04: {type: 'dissolve', durationMs: 640},
  B31: {type: 'fade-black', durationMs: 650},
  B45: {type: 'fade-black', durationMs: 850},
  V34: {type: 'dissolve', durationMs: 750},
};
const impactCuts = new Set(['O63', 'O79', 'Q03', 'X03']);

type Emotion = 'joy' | 'anger' | 'sorrow' | 'mirth';
const expressionAtCut: Readonly<Record<string, {actor: CastMember; note: string; emotion?: Emotion}>> = {
  O06: {actor: 'bakssi', note: '조심스럽게 말문을 연다.'},
  O10: {actor: 'bakssi', note: '함께 마시려던 두 잔을 내려다보며 말을 삼킨다.', emotion: 'sorrow'},
  O22: {actor: 'deukchun', note: '입궐 걱정이 풀려 고마움을 드러낸다.', emotion: 'joy'},
  O27: {actor: 'gyehwa', note: '말 앞에서 서두르지 않고 기다린다.'},
  O39: {actor: 'sibaek', note: '시험장에서 연적을 보고 긴장이 조금 풀린다.', emotion: 'mirth'},
  O53: {actor: 'gyehwa', note: '비녀를 알아보고 놀라다가 반가워한다.', emotion: 'joy'},
  O62: {actor: 'bakssi', note: '기홍대와 시백 사이에 서서 단호하게 말한다.', emotion: 'anger'},
  O84: {actor: 'sister-young', note: '언니 손에서 힘을 빼며 긴장이 풀린다.', emotion: 'joy'},
  C05: {actor: 'sibaek', note: '박씨와 눈을 마주치지 않은 채 자리를 뜬다.'},
  C28: {actor: 'gyehwa', note: '말이 손바닥을 핥아 웃음이 튀어나온다.', emotion: 'mirth'},
  A05: {actor: 'gyehwa', note: '낯선 얼굴을 보다가 평소의 비녀를 알아본다.', emotion: 'joy'},
  A32: {actor: 'bakssi', note: '더는 위협받지 않아도 된다는 듯 문 쪽으로 비켜선다.'},
  X11: {actor: 'yonggoldae', note: '명령 대신 아우의 이름을 부른다.', emotion: 'sorrow'},
  X27: {actor: 'bakssi', note: '혼례 날보다 더 서러웠다고 어려운 말을 꺼낸다.', emotion: 'sorrow'},
  B06: {actor: 'bakssi', note: '오래 기다린 말을 이제야 듣고, 시백의 대답을 기다린다.', emotion: 'sorrow'},
  B23: {actor: 'bakssi', note: '자기 실수에 귀가 빨개지고 먹 자국을 수습한다.', emotion: 'sorrow'},
  N14: {actor: 'grandmother', note: '젖은 계화를 보고 버럭하는 듯하다가 웃음을 삼킨다.', emotion: 'mirth'},
  U23: {actor: 'grandmother', note: '아기가 국자에 얼굴을 비춰 보는 것을 보고 웃는다.', emotion: 'joy'},
  V28: {actor: 'mother', note: '아이를 만나 안도하면서도 먼저 젖은 발을 닦는다.', emotion: 'joy'},
};

export const bakssiCutEmotionNote = (id: string) => expressionAtCut[id]?.note ?? '';

export function bakssiCutStage(id: string, speakerName: string): {
  backgroundId: string;
  composition: StageComposition;
  speaker: 'left' | 'right';
  presentation?: StoryPresentation;
  audio?: StoryAudio;
} {
  const scene = sceneByCut.get(id);
  if (!scene) throw new Error(`박씨전 ${id}: 무대가 연결되지 않았어요.`);
  const [, location, ...stagedActors] = scene;
  const speakerActor = spokenRoles.get(speakerName);
  const actors = speakerActor && !stagedActors.some(actor => memberOf(actor) === speakerActor)
    ? [...stagedActors.slice(0, 2), speakerActor === 'bakssi' && /^[AMQXY]/u.test(id) ? 'bakssi-revealed' as const : speakerActor]
    : stagedActors;
  // Keep the first actor on the left and both counterparts on the right when present.
  const leftActors = actors.slice(0, 1).map(actor => poseFor(actor, id));
  const rightActors = actors.slice(1).map(actor => poseFor(actor, id));
  const speakerActorKey = speakerActor ? characterKey(speakerActor) : undefined;
  const transition = transitions[id];
  const effects = impactCuts.has(id)
    ? [{type: 'shake', intensity: 'soft', trigger: 'scene-enter', durationMs: 340, target: {kind: 'background'}}] satisfies StoryPresentation['effects']
    : undefined;
  const storyMusic = music[id];
  const storyAmbience = ambience[id];
  const soundName = sound[id];
  return {
    backgroundId: `bakssi-stage-${location}`,
    composition: {
      leftActors,
      rightActors,
      ...(speakerActorKey ? {speakerActorKey} : {}),
    },
    speaker: speakerActorKey && leftActors.some(actor => actor.key === speakerActorKey) ? 'left' : 'right',
    ...(transition || effects ? {presentation: {...(transition ? {transition} : {}), ...(effects ? {effects} : {})}} : {}),
    ...(storyMusic || storyAmbience || soundName ? {
      audio: {
        ...(storyMusic ? {music: storyMusic} : {}),
        ...(storyAmbience ? {ambience: storyAmbience} : {}),
        ...(soundName ? {sounds: [{id: `bakssi-${id.toLowerCase()}-${soundName}`, assetId: `audio:sound:sfx-${soundName}`, volume: .35}]} : {}),
      },
    } : {}),
  };
}
