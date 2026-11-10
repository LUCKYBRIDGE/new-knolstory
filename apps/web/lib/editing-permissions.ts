import type {EditorPreferences, EditingScreen} from './editor-preferences';

/** What a teacher lets a student edit (docs/architecture/classroom-design.md §4). Text is always allowed. */
export type EditingPermissions = Readonly<{
  text: true;
  images: boolean;
  characters: boolean;
  audio: boolean;
  direction: boolean;
  choices: boolean;
  newWorks: boolean;
  forcedStoryKey: string | null;
}>;

export const ALL_EDITING_ALLOWED: EditingPermissions = {text: true, images: true, characters: true, audio: true, direction: true, choices: true, newWorks: true, forcedStoryKey: null};

export const EDITING_PRESETS = {
  textOnly: {...ALL_EDITING_ALLOWED, images: false, characters: false, audio: false, direction: false, choices: false},
  textAndImages: {...ALL_EDITING_ALLOWED, characters: false, audio: false, direction: false, choices: false},
  all: ALL_EDITING_ALLOWED,
} as const satisfies Record<string, EditingPermissions>;

/** Student setting wins over the class default; nothing set means everything is allowed. */
export function resolveEditingPermissions(student: EditingPermissions | null | undefined, classDefault: EditingPermissions | null | undefined): EditingPermissions {
  return student ?? classDefault ?? ALL_EDITING_ALLOWED;
}

/** Screens a student may open. 배경·인물 편집 needs image permission as well as its own. */
export function allowedEditingScreen(screen: EditingScreen, permissions: EditingPermissions): boolean {
  if (screen === 'background') return permissions.images;
  if (screen === 'characters') return permissions.images && permissions.characters;
  if (screen === 'audio') return permissions.audio;
  if (screen === 'direction') return permissions.direction;
  if (screen === 'audio-direction') return permissions.audio && permissions.direction;
  return true;
}

/** Editor preferences after the teacher's limits: blocked features stay off and blocked screens fall back to 기본편집. */
export function restrictEditorPreferences(preferences: EditorPreferences, permissions: EditingPermissions): EditorPreferences {
  if (permissions === ALL_EDITING_ALLOWED) return preferences;
  const enabled = {
    characters: preferences.enabled.characters && permissions.images && permissions.characters,
    audio: preferences.enabled.audio && permissions.audio,
    direction: preferences.enabled.direction && permissions.direction,
  };
  const logic = {
    choices: preferences.logic.choices && permissions.choices,
    scores: preferences.logic.scores && permissions.choices,
    branches: preferences.logic.branches && permissions.choices,
  };
  const screen = allowedEditingScreen(preferences.screen, permissions) ? preferences.screen : 'basic';
  return {...preferences, enabled, logic, screen};
}

/** One plain sentence per limit, for the student's editor and dashboard. */
export function describeEditingPermissions(permissions: EditingPermissions): string[] {
  const lines: string[] = [];
  if (!permissions.images) lines.push('그림은 바꿀 수 없어요. 글을 써 주세요.');
  else if (!permissions.characters) lines.push('인물 배치는 바꿀 수 없어요.');
  if (!permissions.audio) lines.push('소리는 바꿀 수 없어요.');
  if (!permissions.direction) lines.push('연출은 바꿀 수 없어요.');
  if (!permissions.choices) lines.push('선택지와 점수는 바꿀 수 없어요.');
  if (!permissions.newWorks) lines.push('새 작품을 만들거나 가져올 수 없어요.');
  if (permissions.forcedStoryKey) lines.push('선생님이 정한 작품만 편집할 수 있어요.');
  return lines;
}
