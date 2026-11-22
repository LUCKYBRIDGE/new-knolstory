import type {Assignment} from './classroom-api';
import type {Mission} from './mission-api';
/** One "할 일" list for students: writing tasks and missions together, most urgent first. */
export type TodoEntry={type:'assignment';item:Assignment}|{type:'mission';item:Mission};
export type TodoGroup='todo'|'waiting'|'later'|'done'|'archived';
export function todoGroup(entry:TodoEntry):TodoGroup{
 if(entry.item.archived)return 'archived';
 if(entry.type==='assignment'){const item=entry.item;if(!item.open||item.reviewStatus==='passed')return 'done';if(item.after&&!item.after.passed)return 'later';if(item.reviewStatus==='revise')return 'todo';return item.submittedAt?'waiting':'todo';}
 const item=entry.item,progress=item.progress;
 if(progress?.reviewStatus==='passed'||!item.open)return 'done';
 if(progress?.submittedAt&&progress.reviewStatus===null)return 'waiting';
 return 'todo';
}
const due=(entry:TodoEntry)=>entry.item.dueAt??Number.MAX_SAFE_INTEGER;
/** A later stage that waits for the teacher's pass is not something to do yet: it goes after what can be done now. */
const locked=(entry:TodoEntry)=>entry.type==='assignment'&&!!entry.item.after&&!entry.item.after.passed?1:0;
export function groupTodos(assignments:readonly Assignment[],missions:readonly Mission[]):Record<TodoGroup,TodoEntry[]>{
 const entries:TodoEntry[]=[...assignments.map(item=>({type:'assignment' as const,item})),...missions.map(item=>({type:'mission' as const,item}))];
 const groups:Record<TodoGroup,TodoEntry[]>={todo:[],waiting:[],later:[],done:[],archived:[]};
 for(const entry of entries)groups[todoGroup(entry)].push(entry);
 for(const list of Object.values(groups))list.sort((a,b)=>locked(a)-locked(b)||due(a)-due(b)||b.item.createdAt-a.item.createdAt);
 return groups;
}
