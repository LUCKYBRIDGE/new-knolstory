import { isRuntimeEvent, type RuntimeEvent } from '@knolstory/runtime-contract';
export type { Rect, RuntimeEvent } from '@knolstory/runtime-contract';
/** Validate all iframe reports using the shared runtime contract boundary. */
export function parseRuntimeEvent(value: unknown): RuntimeEvent | null {
  return isRuntimeEvent(value) ? value : null;
}
