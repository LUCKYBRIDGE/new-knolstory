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

/** Editing tools one writing task allows (docs/architecture/classroom-design.md §과제별 편집 범위). */
export type EditScope = Readonly<{images: boolean; characters: boolean; audio: boolean; direction: boolean; choices: boolean}>;
const scopeOf = (permissions: EditingPermissions): EditScope => ({images: permissions.images, characters: permissions.characters, audio: permissions.audio, direction: permissions.direction, choices: permissions.choices});
export const EDIT_SCOPE_PRESETS: readonly {key: 'textOnly' | 'textAndImages' | 'all'; label: string; scope: EditScope}[] = [
  {key: 'textOnly', label: '글만', scope: scopeOf(EDITING_PRESETS.textOnly)},
  {key: 'textAndImages', label: '글과 그림', scope: scopeOf(EDITING_PRESETS.textAndImages)},
  {key: 'all', label: '모든 편집', scope: scopeOf(EDITING_PRESETS.all)},
];
const sameScope = (a: EditScope, b: EditScope) => a.images === b.images && a.characters === b.characters && a.audio === b.audio && a.direction === b.direction && a.choices === b.choices;
/** A short name for a task's scope: one of the presets, or the tools it allows. */
export function editScopeLabel(scope: EditScope | null | undefined): string {
  if (!scope) return '학급 설정대로';
  const preset = EDIT_SCOPE_PRESETS.find(item => sameScope(item.scope, scope));
  if (preset) return preset.label;
  const tools = [scope.images && '그림', scope.images && scope.characters && '인물 배치', scope.audio && '음향', scope.direction && '연출', scope.choices && '선택지'].filter(Boolean);
  return ['글', ...tools].join('·');
}
/** What a student may edit in one task's work: the task's own scope when it has one, else the class/student setting.
 * Account-level limits (new works, a fixed work) are never widened by a task. */
export function taskPermissions(base: EditingPermissions, scope: EditScope | null | undefined): EditingPermissions {
  if (!scope) return base;
  return {...base, images: scope.images, characters: scope.images && scope.characters, audio: scope.audio, direction: scope.direction, choices: scope.choices};
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

/** Editor preferences after the teacher's limits: blocked features stay off and blocked screens fall back to 쓰기 (basic). */
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
