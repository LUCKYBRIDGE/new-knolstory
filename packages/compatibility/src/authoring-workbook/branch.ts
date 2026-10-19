import type {StoryBranchCondition} from '@knolstory/story-domain';
import {col,issue,type Row} from './stage';
import {workbookRow,type TableSpec} from './model';
export const BRANCH_COLUMNS=[col('branchConditionPresent','선택 갈래 조건 있음','boolean'),col('branchSourceLineId','조건 선택 컷 ID','text',true),col('branchChoiceId','조건 선택지 ID','text',true)];
export function branchRow(condition:StoryBranchCondition|undefined):Row{return {branchConditionPresent:condition!==undefined,branchSourceLineId:condition?.sourceLineId,branchChoiceId:condition?.choiceId};}
export function readBranch(row:Row,spec:TableSpec):{branchCondition?:StoryBranchCondition}{
 if(!row.branchConditionPresent){if(row.branchSourceLineId!==undefined||row.branchChoiceId!==undefined)issue(spec,'선택 갈래 조건 없음과 조건 값이 충돌합니다.',workbookRow(row),'선택 갈래 조건');return {};}
 if(typeof row.branchSourceLineId!=='string'||!row.branchSourceLineId.trim()||typeof row.branchChoiceId!=='string'||!row.branchChoiceId.trim())issue(spec,'조건 선택 컷 ID와 선택지 ID를 함께 입력해 주세요.',workbookRow(row),'선택 갈래 조건');
 return {branchCondition:{sourceLineId:row.branchSourceLineId,choiceId:row.branchChoiceId}};
}
