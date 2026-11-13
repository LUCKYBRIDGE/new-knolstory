import type {Assignment} from './classroom-api';
import type {Mission} from './mission-api';
/** One "할 일" list for students: writing tasks and missions together, most urgent first. */
export type TodoEntry={type:'assignment';item:Assignment}|{type:'mission';item:Mission};
export type TodoGroup='todo'|'waiting'|'done';
export function todoGroup(entry:TodoEntry):TodoGroup{
 if(entry.type==='assignment'){const item=entry.item;if(!item.open)return 'done';return item.submittedAt?'waiting':'todo';}
 const item=entry.item,progress=item.progress;
 if(progress?.reviewStatus==='passed'||!item.open)return 'done';
 if(progress?.submittedAt&&progress.reviewStatus===null)return 'waiting';
 return 'todo';
}
const due=(entry:TodoEntry)=>entry.item.dueAt??Number.MAX_SAFE_INTEGER;
export function groupTodos(assignments:readonly Assignment[],missions:readonly Mission[]):Record<TodoGroup,TodoEntry[]>{
 const entries:TodoEntry[]=[...assignments.map(item=>({type:'assignment' as const,item})),...missions.map(item=>({type:'mission' as const,item}))];
 const groups:Record<TodoGroup,TodoEntry[]>={todo:[],waiting:[],done:[]};
 for(const entry of entries)groups[todoGroup(entry)].push(entry);
 for(const list of Object.values(groups))list.sort((a,b)=>due(a)-due(b)||b.item.createdAt-a.item.createdAt);
 return groups;
}
