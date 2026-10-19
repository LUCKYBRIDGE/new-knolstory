/** Author-defined plot state. These scores never represent student assessment. */
export type StoryScoreDefinition = { id: string; name: string; description: string; initial: number };
export type StoryScoreTerm = { scoreId: string; operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'; value: number };
export type StoryScoreCondition = { mode: 'all' | 'any'; terms: StoryScoreTerm[] };
export type StoryScoreEffect = { scoreId: string; operation: 'add' | 'set'; value: number };
export type StoryScoreRoute = { id: string; condition: StoryScoreCondition; targetLineId: string | null };
export const STORY_SCORE_LIMIT = 1_000_000;
export const STORY_SCORE_MAX_DEFINITIONS = 32;
export const STORY_SCORE_MAX_EFFECTS = 16;
export const STORY_SCORE_MAX_TERMS = 8;
export const STORY_SCORE_MAX_ROUTES = 16;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function denseArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return false;
  return true;
}
export function hasOnlyStoryKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every(key => keys.includes(key));
}
export function isStoryScoreNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= STORY_SCORE_LIMIT;
}
function id(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value.length <= 200;
}
function isDefinition(value: unknown): value is StoryScoreDefinition {
  return record(value) && hasOnlyStoryKeys(value, ['id', 'name', 'description', 'initial']) && id(value.id) &&
    typeof value.name === 'string' && Boolean(value.name.trim()) && value.name.length <= 80 &&
    typeof value.description === 'string' && value.description.length <= 2000 && isStoryScoreNumber(value.initial);
}
export function isStoryScoreDefinitions(value: unknown): value is StoryScoreDefinition[] {
  return denseArray(value) && value.length <= STORY_SCORE_MAX_DEFINITIONS && value.every(isDefinition) && new Set(value.map(item => item.id)).size === value.length;
}
function isTerm(value: unknown): value is StoryScoreTerm {
  return record(value) && hasOnlyStoryKeys(value, ['scoreId', 'operator', 'value']) && id(value.scoreId) &&
    typeof value.operator === 'string' && ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].includes(value.operator) && isStoryScoreNumber(value.value);
}
export function isStoryScoreCondition(value: unknown): value is StoryScoreCondition {
  return record(value) && hasOnlyStoryKeys(value, ['mode', 'terms']) && (value.mode === 'all' || value.mode === 'any') &&
    denseArray(value.terms) && value.terms.length >= 1 && value.terms.length <= STORY_SCORE_MAX_TERMS && value.terms.every(isTerm);
}
function isEffect(value: unknown): value is StoryScoreEffect {
  return record(value) && hasOnlyStoryKeys(value, ['scoreId', 'operation', 'value']) && id(value.scoreId) &&
    (value.operation === 'add' || value.operation === 'set') && isStoryScoreNumber(value.value);
}
export function isStoryScoreEffects(value: unknown): value is StoryScoreEffect[] {
  return denseArray(value) && value.length <= STORY_SCORE_MAX_EFFECTS && value.every(isEffect);
}
function isRoute(value: unknown): value is StoryScoreRoute {
  return record(value) && hasOnlyStoryKeys(value, ['id', 'condition', 'targetLineId']) && id(value.id) &&
    isStoryScoreCondition(value.condition) && (value.targetLineId === null || typeof value.targetLineId === 'string');
}
export function isStoryScoreRoutes(value: unknown): value is StoryScoreRoute[] {
  return denseArray(value) && value.length <= STORY_SCORE_MAX_ROUTES && value.every(isRoute) && new Set(value.map(item => item.id)).size === value.length;
}
