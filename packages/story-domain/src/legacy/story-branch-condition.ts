/** The chosen option identity, independent of its label or destination. */
export type StoryBranchChoice = { sourceLineId: string; choiceId: string };
export type StoryBranchCondition = StoryBranchChoice | { mode: 'all' | 'any'; terms: StoryBranchChoice[] };

function isChoice(value: unknown): value is StoryBranchChoice {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const id = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
  return Object.keys(record).length === 2
    && Object.keys(record).every(key => key === 'sourceLineId' || key === 'choiceId')
    && id(record.sourceLineId) && id(record.choiceId);
}
export function isStoryBranchCondition(value: unknown): value is StoryBranchCondition {
  if (isChoice(value)) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 2 && Object.keys(record).every(key => key === 'mode' || key === 'terms')
    && (record.mode === 'all' || record.mode === 'any') && Array.isArray(record.terms)
    && record.terms.length >= 1 && record.terms.length <= 8 && Array.from(record.terms).every(isChoice)
    && new Set(record.terms.map(term => JSON.stringify([term.sourceLineId, term.choiceId]))).size === record.terms.length;
}
/** Normalize for inspection only; preserving a single condition's authored shape is intentional. */
export function storyBranchConditionTerms(condition: StoryBranchCondition): readonly StoryBranchChoice[] {
  return 'terms' in condition ? condition.terms : [condition];
}
