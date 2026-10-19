'use client';
import {useState} from 'react';
import {PRESENTATION_LOOKS,PRESENTATION_TRANSITIONS,type StoryProject,type StoryLine,type StageComposition,type StoryPresentation} from '@knolstory/story-domain';
import {StoryTransitionControls} from './story-transition-controls';
import {StoryEffectControls} from './story-effect-controls';
import {StoryActorAppearanceControls} from './story-actor-appearance-controls';
import styles from './story-direction-panel.module.css';
type Kind='transition'|'look'|'effects'|'actors';
type Props={onPreviewFromBranch?:(sourceLineId:string)=>void;project:StoryProject;line:StoryLine;stage:StageComposition;onChange:(value:StoryPresentation|undefined)=>void;onProjectChange:(value:StoryProject)=>void;onMotion?:()=>void};
const kinds:readonly [Kind,string,string][]=[['transition','화면 전환','이 컷에 들어오기 전 화면을 바꿉니다.'],['look','색감·분위기','현재 컷을 회상이나 다른 분위기로 표현합니다.'],['effects','흔들림·화면 효과','효과를 적용할 대상과 시작·지속 시간·반복·컷 범위를 조정합니다.'],['actors','인물 강조·투명도','배치한 인물의 밝기와 보이는 정도를 조정합니다.']];
export function StoryDirectionPanel(p:Props){
 const value=p.line.presentation;
 const hasAppearance=Object.values(value?.actors??{}).some(actor=>actor.opacity!==undefined||actor.emphasis!==undefined||actor.spectral!==undefined);
 const motionCount=[...p.stage.leftActors,...p.stage.rightActors].filter(actor=>actor.motion).length;
 const [kind,setKind]=useState<Kind>(()=>value?.effects?.length||value?.clearFollowingEffects?'effects':value?.transition?'transition':value?.look?'look':hasAppearance?'actors':'transition');
 const applied={transition:value?.transition?PRESENTATION_TRANSITIONS.find(item=>item.type===value.transition?.type)?.label:'없음',look:value?.look?PRESENTATION_LOOKS.find(item=>item.type===value.look?.type)?.label:'기본',effects:value?.effects?.length?`${value.effects.length}개`:value?.clearFollowingEffects?'이전 효과 종료':'없음',actors:hasAppearance?'설정 있음':'기본'};
 return <div className={styles.panel}>
  <label>조정할 연출<select aria-label="조정할 연출" value={kind} onChange={event=>{if(event.target.value==='motion'){p.onMotion?.();return;}setKind(event.target.value as Kind);}}>{kinds.map(([key,name])=><option key={key} value={key}>{name} · {applied[key]}</option>)}{p.onMotion&&<option value="motion">인물 등장·이동·퇴장 · {motionCount?`${motionCount}명 설정`:"기본"}</option>}</select></label>
  <p>{kinds.find(([key])=>key===kind)?.[2]} 무대의 ‘이 컷부터 재생’으로 확인합니다.</p>
  <section hidden={kind!=='transition'} aria-label="화면 전환 편집"><StoryTransitionControls part="transition" value={value} onChange={p.onChange}/></section>
  <section hidden={kind!=='look'} aria-label="색감·분위기 편집"><StoryTransitionControls part="look" value={value} onChange={p.onChange}/></section>
  <section hidden={kind!=='effects'} aria-label="화면 효과 편집"><StoryEffectControls onPreviewFromBranch={p.onPreviewFromBranch} project={p.project} lineId={p.line.id} value={value} stage={p.stage} onChange={p.onChange} onProjectChange={p.onProjectChange}/></section>
  <section hidden={kind!=='actors'} aria-label="인물 강조 편집"><StoryActorAppearanceControls inline stage={p.stage} onPlaceActors={p.onMotion} value={value} onChange={p.onChange}/></section>
 </div>;
}
