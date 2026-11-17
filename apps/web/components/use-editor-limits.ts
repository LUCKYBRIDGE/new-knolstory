'use client';
import type {EditingPermissions} from '../lib/editing-permissions';
import {useClassroomMe,type ClassroomRoleState} from './use-classroom-me';

export type EditorRole=ClassroomRoleState;
/** Role and teacher limits that apply to the editor; everything is allowed without the online build or a login. */
export function useEditorLimits():{role:EditorRole;permissions:EditingPermissions;accountId:string|null;csrf:string|null;loading:boolean}{
  const {role,permissions,session,loading}=useClassroomMe();
  return {role,permissions,accountId:session?.accountId??null,csrf:session?.csrf??null,loading};
}
