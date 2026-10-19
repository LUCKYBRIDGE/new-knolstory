/** The chosen option identity, independent of its label or destination. */
export type StoryBranchCondition = { sourceLineId: string; choiceId: string };

export function isStoryBranchCondition(value: unknown): value is StoryBranchCondition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const id = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
  return Object.keys(record).length === 2
    && Object.keys(record).every(key => key === 'sourceLineId' || key === 'choiceId')
    && id(record.sourceLineId) && id(record.choiceId);
}
