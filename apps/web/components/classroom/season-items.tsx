import type {ReactNode} from 'react';

export function SeasonItems<T extends {archived?:true}>({items,render}:{items:readonly T[];render:(rows:readonly T[])=>ReactNode}){
 const current=items.filter(item=>!item.archived),past=items.filter(item=>item.archived);
 return <>{current.length>0&&render(current)}{past.length>0&&<details><summary>지난 학년 · {past.length}개</summary>{render(past)}</details>}</>;
}
