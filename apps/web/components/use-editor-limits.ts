'use client';
import {ALL_EDITING_ALLOWED,type EditingPermissions} from '../lib/editing-permissions';

export type EditorRole='guest'|'member'|'teacher'|'student'|'admin';
/** Signed-in members keep at most this many of their own works on the device (classroom-design §1). */
export const MEMBER_WORK_LIMIT=3;

/** Role and teacher limits that apply to the editor. Replaced by the classroom session once it is wired. */
export function useEditorLimits():{role:EditorRole;permissions:EditingPermissions}{
  return {role:'guest',permissions:ALL_EDITING_ALLOWED};
}
