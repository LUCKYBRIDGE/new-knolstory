'use client';
import type {EditingPermissions} from '../lib/editing-permissions';
import {useClassroomMe,type ClassroomRoleState} from './use-classroom-me';

export type EditorRole=ClassroomRoleState;
/** Signed-in members keep at most this many of their own works on the device (classroom-design §1). */
export const MEMBER_WORK_LIMIT=3;

/** Role and teacher limits that apply to the editor; everything is allowed without the online build or a login. */
export function useEditorLimits():{role:EditorRole;permissions:EditingPermissions}{
  const {role,permissions}=useClassroomMe();
  return {role,permissions};
}
