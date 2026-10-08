'use client';
import {trapDialogTab} from '../lib/dialog-keyboard';
import { useEffect, useId, useRef, useState } from 'react';
import { ASSET_CATALOG, isSelectableAsset } from '@knolstory/asset-registry';
import { COVER_FONTS, COVER_PRESET_OPTIONS, COVER_THEMES, isStoryCover, type StoryCover, type StoryCoverComposition, type StoryProject } from '@knolstory/story-domain';
import { applyCoverPreset, defaultCoverComposition, resolveStoryCover, updateCoverComposition } from '../lib/book-cover';
import { addCoverElement, coverElementText, COVER_DESIGN_OPTIONS, createCoverDesign, editCoverBox, patchCoverElement, removeCoverElement, reorderCoverElement, selectCoverFacePreset, type CoverDesign, type CoverElement, type CoverFaceId, type CoverTextElement } from '../lib/book-cover-editor';
import { AssetPickerField } from './asset-picker-field';
import { BookCover } from './book-cover';
import {commitCoverDraft,undoCoverDraft,redoCoverDraft,type CoverDraftHistory} from '../lib/cover-editor-interactions';
import {CoverEditorCanvas} from './cover-editor-canvas';
import styles from './book-cover-editor.module.css';

const faceLabels={front:'앞표지',spine:'책등',back:'뒤표지'};
type CoverHistory=CoverDraftHistory;
/** REFINE: fixed story-maker@18da4fc BookCoverEditor and CoverLayersEditor.
 * Cover changes remain isolated until Apply. Bound layer text follows draft book information; Apply commits title and cover. */
export function BookCoverEditor({project,onApply,onCancel}:{project:StoryProject;onApply:(cover:StoryCover,title:string)=>void;onCancel:()=>void}) {
  const [initial]=useState<StoryCover>(()=>structuredClone(resolveStoryCover(project)));
  const [history,setHistory]=useState<CoverHistory>(()=>({past:[],present:{cover:initial,title:project.title},future:[]}));
  const title=history.present.title;
  const setTitle=(title:string)=>setHistory(current=>commitCoverDraft(current,{...current.present,title}));
  const previewProject={...project,title};
  const [face,setFace]=useState<CoverFaceId>('front'),[selectedId,select]=useState(''),[message,setMessage]=useState('');
  const [applying,setApplying]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),headingId=useId();
  const gestureStart=useRef<CoverHistory|null>(null);
  const cover=history.present.cover,design=cover.design,items=design?.faces[face].elements??[],selected=items.find(item=>item.id===selectedId);
  useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const element=dialog.current;element?.showModal();return()=>{element?.close();opener?.focus();};},[]);
  const commit=(next:StoryCover)=>{
    if(!isStoryCover(next)){setMessage('상자 글은 500자까지 쓸 수 있어요. 그림과 크기·위치 범위도 확인해 주세요.');return;}
    setHistory(current=>commitCoverDraft(current,{...current.present,cover:next}));setMessage('');
  };
  const patch=(changes:Partial<StoryCover>)=>{
    const next={...cover,...changes};
    if(cover.composition&&(changes.titlePosition||changes.characterPosition)){
      const defaults=defaultCoverComposition(next);
      next.composition={...cover.composition,...(changes.titlePosition?{titleY:defaults.titleY}:{}),...(changes.characterPosition?{characterX:defaults.characterX}:{})};
    }
    commit(next);
  };
  const commitDesign=(next:CoverDesign)=>patch({design:next});
  const elementPatch=(changes:Parameters<typeof patchCoverElement>[3])=>{
    if(!design||!selected)return;
    try{commitDesign(patchCoverElement(design,face,selected.id,changes));}catch(error){setMessage(error instanceof Error?error.message:'상자 값과 글 길이를 확인해 주세요.');}
  };
  const add=(type:'text'|'image',assetType:'background'|'character'='background')=>{
    if(!design)return;
    const id=`box-${crypto.randomUUID()}`,box={x:.12,y:.25,w:.76,h:.18};
    const asset=ASSET_CATALOG.find(asset=>asset.type===assetType&&isSelectableAsset(asset));
    if(type==='image'&&!asset){setMessage('선택할 그림 자료가 없어요.');return;}
    const element:CoverElement=type==='text'?{id,type,role:'custom',region:'face',content:{text:'새 글'},box,style:{fontId:cover.font,fontSize:.06,color:design.finish.ink,align:'center',writing:'horizontal'}}
      :{id,type,role:assetType==='character'?'actor':'scene',assetId:asset!.id,assetType,box:{...box,h:.4},frame:'rect',crop:{fit:'contain',zoom:1,x:50,y:50}};
    try{commitDesign(addCoverElement(design,face,element));select(id);}catch(error){setMessage(error instanceof Error?error.message:'이 면의 상자 개수를 확인해 주세요.');}
  };
  const undo=()=>setHistory(undoCoverDraft);
  const redo=()=>setHistory(redoCoverDraft);
  const updateFinish=(key:keyof CoverDesign['finish'],value:string)=>{
    if(!design)return;
    const previous=design.finish[key];
    const faces=(key==='ink'||key==='color')?Object.fromEntries(Object.entries(design.faces).map(([id,side])=>[id,{...side,elements:side.elements.map(item=>item.type==='text'&&item.style.color.toLowerCase()===String(previous).toLowerCase()?{...item,style:{...item.style,color:value}}:item)}])) as CoverDesign['faces']:design.faces;
    commitDesign({...design,finish:{...design.finish,[key]:value},faces});
  };
  const apply=()=>{if(applying)return;setApplying(true);try{onApply(structuredClone(cover),title);}catch(error){setMessage(error instanceof Error?error.message:'표지를 적용하지 못했어요. 다시 시도해 주세요.');setApplying(false);}};
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={headingId} onKeyDown={event=>trapDialogTab(event,dialog.current)} onCancel={event=>{event.preventDefault();if(!applying)onCancel();}}>
    <header className={styles.header}><div><small>한 권의 이야기를 직접 꾸며요</small><h2 id={headingId}>내 책 표지 꾸미기</h2></div><button type="button" onClick={onCancel} disabled={applying}>닫기</button></header>
    <div className={styles.body}>
      <section className={styles.preview} aria-label="표지 미리보기">
        <div className={styles.actions}>{(Object.keys(faceLabels) as CoverFaceId[]).map(id=><button key={id} type="button" aria-pressed={face===id} onClick={()=>{setFace(id);select('');}}>{faceLabels[id]}</button>)}</div>
        <div className={styles.book} data-face={face}><CoverEditorCanvas project={previewProject} cover={cover} face={face} selectedId={selectedId} onSelect={select}
          onBegin={()=>{gestureStart.current=history;}}
          onChange={(next,gesture)=>{if(gesture)setHistory(current=>({...current,present:{...current.present,cover:next}}));else commit(next);}}
          onEnd={cancelled=>{const start=gestureStart.current;gestureStart.current=null;if(!start)return;setHistory(current=>cancelled?start:commitCoverDraft(start,current.present));}} /></div>
        <p>긴 글은 상자에 맞춰 작아져요. 표지의 제목은 작품 제목을 따라갑니다.</p>
        <div className={styles.actions}><button type="button" disabled={!history.past.length||applying} onClick={undo}>되돌리기</button><button type="button" disabled={!history.future.length||applying} onClick={redo}>다시 하기</button></div>
      </section>
      <section className={styles.fields} aria-label="표지 편집 설정">
        <label>작품 제목<input aria-label="작품 제목" value={title} onChange={event=>setTitle(event.target.value)}/><small>표지 적용을 누르면 작품 제목에도 함께 적용됩니다.</small></label>
        <label>지은이<input value={cover.author} onChange={event=>patch({author:event.target.value})}/></label>
        <label>표지 소개 문장<input value={cover.subtitle} onChange={event=>patch({subtitle:event.target.value})}/></label>
        <label>작가의 말<textarea value={cover.authorNote} onChange={event=>patch({authorNote:event.target.value})}/></label>
        {!design?<>
          <fieldset><legend>디자인 골라 시작하기</legend><div className={styles.presets}>{COVER_PRESET_OPTIONS.map(option=><button type="button" key={option.id} aria-pressed={(cover.presetId??cover.layout)===option.id} onClick={()=>commit(applyCoverPreset(cover,option.id))}><span className={styles.presetThumbnail} aria-hidden="true"><BookCover project={{...previewProject,cover:applyCoverPreset(cover,option.id)}} compact/></span><strong>{option.label}</strong><small>{option.description}</small></button>)}</div></fieldset>
          <Select label="표지 색감" value={cover.theme} options={Object.entries(COVER_THEMES).map(([id,theme])=>[id,theme.label])} onChange={value=>patch({theme:value as StoryCover['theme']})}/>
          <Select label="제목 글꼴" value={cover.font} options={Object.entries(COVER_FONTS).map(([id,font])=>[id,font.label])} onChange={value=>patch({font:value as StoryCover['font']})}/>
          <Range label="제목 크기" value={cover.titleSize} min={14} max={80} onChange={titleSize=>patch({titleSize})}/>
          <label>제목 글자색<input type="color" value={cover.titleColor||COVER_THEMES[cover.theme].ink} onChange={event=>patch({titleColor:event.target.value})}/></label><button type="button" onClick={()=>patch({titleColor:''})}>색감의 기본 글자색</button>
          <Select label="제목 위치" value={cover.titlePosition} options={[["top","위쪽"],["middle","가운데"],["bottom","아래쪽"]]} onChange={value=>patch({titlePosition:value as StoryCover['titlePosition']})}/>
          <Select label="지은이 위치" value={cover.authorPosition} options={[["under-title","제목 바로 아래"],["bottom","맨 아래"]]} onChange={value=>patch({authorPosition:value as StoryCover['authorPosition']})}/>
          <Select label="글 정렬" value={cover.align} options={[["left","왼쪽"],["center","가운데"]]} onChange={value=>patch({align:value as StoryCover['align']})}/>
          <AssetPickerField label="표지 배경" type="background" value={cover.backgroundId} allowNone onChange={backgroundId=>patch({backgroundId})}/>
          <AssetPickerField label="표지 인물" type="character" value={cover.characterId} allowNone onChange={characterId=>patch({characterId})}/>
          <Select label="인물 위치" value={cover.characterPosition} options={[["left","왼쪽"],["center","가운데"],["right","오른쪽"]]} onChange={value=>patch({characterPosition:value as StoryCover['characterPosition']})}/>
          <details><summary>내 마음대로 배치</summary><button type="button" aria-pressed={Boolean(cover.composition)} onClick={()=>{if(cover.composition){const next={...cover};delete next.composition;commit(next);}else patch({composition:defaultCoverComposition(cover)});}}>{cover.composition?'자유 배치 끄기':'자유 배치 시작'}</button>
            {cover.composition&&<CompositionControls composition={cover.composition} patch={changes=>commit(updateCoverComposition(cover,changes))} reset={()=>patch({composition:defaultCoverComposition(cover)})}/>}</details>
          <button type="button" onClick={()=>patch({design:createCoverDesign(cover)})}>세 면과 글·그림 상자 편집 시작</button>
          <p>상자 편집을 시작하면 지금 색감과 그림으로 세 면을 만들어요. 현재 기본 표지 설정도 함께 보관합니다.</p>
        </>:<>
          <fieldset><legend>{faceLabels[face]} 디자인 비교</legend><div className={styles.presets}>{COVER_DESIGN_OPTIONS.map(option=><button type="button" key={option.id} aria-label={`${option.label} 디자인 적용`} aria-pressed={design.faces[face].preset===option.id} onClick={()=>commitDesign(selectCoverFacePreset(design,face,option.id,cover))}><span className={styles.presetThumbnail} aria-hidden="true"><BookCover project={{...previewProject,cover:{...cover,design:selectCoverFacePreset(design,face,option.id,cover)}}} face={face} compact/></span><strong>{option.label}</strong></button>)}</div></fieldset>
          <Select label={`${faceLabels[face]} 디자인`} value={design.faces[face].preset} options={COVER_DESIGN_OPTIONS.map(option=>[option.id,option.label])} onChange={value=>commitDesign(selectCoverFacePreset(design,face,value as CoverDesign['faces']['front']['preset'],cover))}/>
          <details><summary>종이·색·장식</summary>
            <Select label="재질" value={design.finish.stock} options={[["cream","종이"],["matte","무광"],["cloth","천 장정"]]} onChange={value=>updateFinish('stock',value)}/>
            <Select label="질감" value={design.finish.texture} options={[["normal","기본"],["subtle","약하게"],["none","없음"]]} onChange={value=>updateFinish('texture',value)}/>
            {([['color','책 바탕색'],['ink','기본 글자색'],['accent','장식색']] as const).map(([key,label])=><label key={key}>{label}<input type="color" value={design.finish[key]} onChange={event=>updateFinish(key,event.target.value)}/></label>)}
            <label className={styles.check}><input type="checkbox" checked={design.band.enabled} onChange={event=>commitDesign({...design,band:{...design.band,enabled:event.target.checked}})}/>띠지 두르기</label>
            <Select label="띠지 디자인" value={design.band.designId} options={[["classic","기본"],["cream","크림 종이"],["ruled","두 줄"],["stripe","가는 줄무늬"]]} onChange={value=>commitDesign({...design,band:{...design.band,designId:value as CoverDesign['band']['designId']}})}/>
          </details>
          <fieldset><legend>{faceLabels[face]} 상자</legend><div className={styles.actions}><button type="button" disabled={items.filter(item=>item.type==='text').length>=12} onClick={()=>add('text')}>글 상자 추가</button><button type="button" disabled={items.filter(item=>item.type==='image').length>=4} onClick={()=>add('image')}>배경 상자 추가</button><button type="button" disabled={items.filter(item=>item.type==='image').length>=4} onClick={()=>add('image','character')}>인물 상자 추가</button></div>
            <div className={styles.list}>{items.map((item,index)=><button type="button" key={item.id} aria-pressed={selectedId===item.id} onClick={()=>select(item.id)}>{index+1}. {item.type==='text'?`글 · ${coverElementText(item,previewProject,cover).slice(0,24)||'빈 글'}${item.region==='band'?' · 띠지':''}`:`${item.assetType==='character'?'인물':'배경'} · ${ASSET_CATALOG.find(asset=>asset.id===item.assetId)?.label??item.assetId}`}</button>)}</div></fieldset>
          {selected&&<fieldset><legend>선택한 {selected.type==='text'?'글':'그림'} 상자</legend>
            {selected.type==='text'?<>
              <Select label="문구 연결" value={'bind' in selected.content?selected.content.bind:'literal'} options={[["literal","이 표지의 독립 문구"],["project.title","작품 제목"],["project.description","작품 소개"],["cover.author","지은이"],["cover.subtitle","표지 소개 문장"],["cover.authorNote","작가의 말"]]} onChange={value=>elementPatch({content:value==='literal'?{text:coverElementText(selected,previewProject,cover)}:{bind:value as Exclude<CoverTextElement['content'],{text:string}>['bind']}})}/>
              <TextBox key={selected.id} value={coverElementText(selected,previewProject,cover)} readOnly={'bind' in selected.content} onChange={text=>elementPatch({content:{text}})} onLimit={()=>setMessage('한 글 상자에는 500자까지 쓸 수 있어요. 새 글 상자에 이어 써 주세요.')}/>
              <Select label="상자 글꼴" value={selected.style.fontId} options={Object.entries(COVER_FONTS).map(([id,font])=>[id,font.label])} onChange={value=>elementPatch({style:{fontId:value as StoryCover['font']}})}/>
              <Range label="상자 글자 크기" value={selected.style.fontSize*100} min={1.5} max={100} step={.5} onChange={value=>elementPatch({style:{fontSize:value/100}})}/>
              <label>상자 글자색<input type="color" value={selected.style.color} onChange={event=>elementPatch({style:{color:event.target.value}})}/></label>
              <Select label="상자 글 정렬" value={selected.style.align} options={[["left","왼쪽"],["center","가운데"],["right","오른쪽"]]} onChange={value=>elementPatch({style:{align:value as CoverTextElement['style']['align']}})}/>
              <Select label="글 방향" value={selected.style.writing} options={[["horizontal","가로"],["vertical","세로"]]} onChange={value=>elementPatch({style:{writing:value as CoverTextElement['style']['writing']}})}/>
              <Select label="글을 넣을 곳" value={selected.region} options={[["face","표지"],["band","띠지 안"]]} onChange={value=>elementPatch({region:value as CoverTextElement['region']})}/>
            </>:<>
              <AssetPickerField label="상자 그림" type={selected.assetType} value={selected.assetId} onChange={assetId=>{if(assetId)elementPatch({assetId});}}/>
              <Select label="그림 종류" value={selected.assetType} options={[["background","배경·장면"],["character","인물"]]} onChange={value=>{const assetType=value as 'background'|'character',asset=ASSET_CATALOG.find(item=>item.type===assetType);if(asset)elementPatch({assetType,assetId:asset.id});}}/>
              <Select label="그림 틀" value={selected.frame} options={[["rect","사각"],["arch","아치"],["oval","타원"]]} onChange={value=>elementPatch({frame:value as 'rect'|'arch'|'oval'})}/>
              <Select label="그림 맞추기" value={selected.crop.fit} options={[["contain","그림 전체"],["cover","틀 채우기"]]} onChange={value=>elementPatch({crop:{fit:value as 'contain'|'cover',zoom:1}})}/>
              <Range label="그림 확대" value={selected.crop.zoom} min={selected.crop.fit==='cover'?1:.5} max={2} step={.05} onChange={zoom=>elementPatch({crop:{zoom}})}/>
              <Range label="그림 가로 초점" value={selected.crop.x} min={0} max={100} onChange={x=>elementPatch({crop:{x}})}/><Range label="그림 세로 초점" value={selected.crop.y} min={0} max={100} onChange={y=>elementPatch({crop:{y}})}/>
            </>}
            <div className={styles.numbers}>{([['x','가로 위치'],['y','세로 위치'],['w','상자 너비'],['h','상자 높이']] as const).map(([key,label])=><label key={key}>{label}<input type="number" min={key==='x'||key==='y'?0:2} max={100} step={1} value={Number((selected.box[key]*100).toFixed(2))} onChange={event=>{if(event.target.value!=='')elementPatch({box:editCoverBox(selected.box,key,event.target.valueAsNumber)});}}/></label>)}</div>
            <div className={styles.actions}><button type="button" disabled={items[0]?.id===selected.id} onClick={()=>commitDesign(reorderCoverElement(design,face,selected.id,-1))}>한 겹 뒤로</button><button type="button" disabled={items.at(-1)?.id===selected.id} onClick={()=>commitDesign(reorderCoverElement(design,face,selected.id,1))}>한 겹 앞으로</button><button type="button" onClick={()=>{commitDesign(removeCoverElement(design,face,selected.id));select('');}}>상자 삭제</button></div>
          </fieldset>}
          <details><summary>기본 표지로 전환</summary><p>세 면의 상자를 없애고 보관한 기본 표지 설정으로 돌아가요. 적용 전에는 되돌릴 수 있어요.</p><button type="button" onClick={()=>{const next={...cover};delete next.design;commit(next);select('');}}>상자 디자인 제거하고 기본 표지 사용</button></details>
        </>}
        <button type="button" onClick={()=>{setHistory(current=>commitCoverDraft(current,{cover:structuredClone(initial),title:project.title}));select('');}}>편집 전 표지로 되돌리기</button>
        <p role="status" className={styles.message}>{message||'변경은 표지 적용 전까지 이 창에만 있어요.'}</p>
      </section>
    </div>
    <footer className={styles.footer}><span>적용한 표지는 작품 파일에도 함께 보관돼요.</span><button type="button" disabled={applying} onClick={onCancel}>취소</button><button type="button" disabled={applying} className={styles.primary} onClick={apply}>표지 적용</button></footer>
  </dialog>;
}

function Select({label,value,options,onChange}:{label:string;value:string;options:readonly (readonly [string,string])[];onChange:(value:string)=>void}){
  return <label>{label}<select aria-label={label} value={value} onChange={event=>onChange(event.target.value)}>{options.map(([id,text])=><option key={id} value={id}>{text}</option>)}</select></label>;
}
function Range({label,value,min,max,step=1,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(value:number)=>void}){
  return <label>{label}<span className={styles.range}><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={event=>onChange(Number(event.target.value))}/><input aria-label={`${label} 숫자`} type="number" min={min} max={max} step={step} value={Number(value.toFixed(2))} onChange={event=>{const next=event.target.valueAsNumber;if(Number.isFinite(next)&&next>=min&&next<=max)onChange(next);}}/></span></label>;
}
function TextBox({value,readOnly,onChange,onLimit}:{value:string;readOnly:boolean;onChange:(text:string)=>void;onLimit:()=>void}){
  const [draft,setDraft]=useState(value),composing=useRef(false);
  useEffect(()=>{if(!composing.current)setDraft(value);},[value]);
  const accept=(text:string)=>{if(Array.from(text).length>500){setDraft(value);onLimit();return;}setDraft(text);onChange(text);};
  return <label>상자 문구<textarea aria-label="상자 문구" readOnly={readOnly} value={draft} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={event=>{composing.current=false;accept(event.currentTarget.value);}} onChange={event=>{if(composing.current)setDraft(event.target.value);else accept(event.target.value);}}/><small>{Array.from(draft).length}자{readOnly?' · 원래 정보에 연결됨':' / 500자'}</small></label>;
}
function CompositionControls({composition,patch,reset}:{composition:StoryCoverComposition;patch:(changes:Partial<StoryCoverComposition>)=>void;reset:()=>void}){
  const ranges=[['titleX','제목 가로 위치',10,90,1],['titleY','제목 세로 위치',5,70,1],['titleWidth','제목 영역 너비',50,90,1],['backgroundX','배경 가로 초점',0,100,1],['backgroundY','배경 세로 초점',0,100,1],['backgroundZoom','배경 확대',1,1.6,.05],['characterX','인물 가로 위치',15,85,1],['characterBottom','인물 바닥 높이',0,35,1],['characterScale','인물 크기',.5,1.3,.05]] as const;
  return <div className={styles.fields}>{ranges.map(([key,label,min,max,step])=><Range key={key} label={label} value={composition[key]} min={min} max={max} step={step} onChange={value=>patch({[key]:value})}/>)}
    <Select label="배경 맞추기" value={composition.backgroundFit} options={[["fill","여백 없이 채우기"],["complete","그림 전체 보기"]]} onChange={value=>patch({backgroundFit:value as StoryCoverComposition['backgroundFit']})}/>
    <Select label="제목 바탕" value={composition.textPanel} options={[["auto","읽기 편한 종이 바탕"],["none","그림 위에 바로 쓰기"]]} onChange={value=>patch({textPanel:value as StoryCoverComposition['textPanel']})}/>
    <label className={styles.check}><input type="checkbox" checked={composition.showEdition} onChange={event=>patch({showEdition:event.target.checked})}/>작품 종류 표시</label><button type="button" onClick={reset}>현재 디자인의 기본 배치로 되돌리기</button>
  </div>;
}
