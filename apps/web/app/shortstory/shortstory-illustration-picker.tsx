'use client';
/* eslint-disable @next/next/no-img-element -- catalog illustrations */
import {ASSET_CATALOG, assetDisplayName, isSelectableAsset, matchesAssetSearch} from '@knolstory/asset-registry';
import {useEffect, useRef, useState} from 'react';
import dialogSurface from '../../components/story-dialog-surface.module.css';
import {trapDialogTab} from '../../lib/dialog-keyboard';
import styles from './shortstory.module.css';

const illustrations = ASSET_CATALOG.filter(asset => asset.metadata.kind === 'scene-illustration' && isSelectableAsset(asset, true));
const pageSize = 24;
type Collection = 'all' | 'story' | 'creative';
const isCreative = (asset: (typeof illustrations)[number]) => asset.metadata.shortStoryCollection === 'creative';
const storyIllustrations = illustrations.filter(asset => !isCreative(asset));
const creativeIllustrations = illustrations.filter(isCreative);
const mixedIllustrations = storyIllustrations.flatMap((asset, index) => {
 const creative = creativeIllustrations[index];
 return creative ? [asset, creative] : [asset];
}).concat(creativeIllustrations.slice(storyIllustrations.length));
const seriesRoots = new Set(illustrations.flatMap(asset =>
 typeof asset.metadata.seriesId === 'string' ? [asset.metadata.seriesId] : []));
const storyOptions = [...new Set(illustrations.map(asset => asset.story).filter((story): story is string => typeof story === 'string' && story.length > 0))];
const seriesOptions = illustrations.filter(asset => seriesRoots.has(asset.id));

export function ShortStoryIllustrationPicker({value, onSelect, onClose}: {
 value: string;
 onSelect: (id: string) => void;
 onClose: () => void;
}) {
 const dialog = useRef<HTMLDialogElement>(null);
 const [collection, setCollection] = useState<Collection>('all');
 const creative = collection === 'creative';
 const changeCollection = (next: Collection) => {setCollection(next); setLimit(pageSize);};
 const [query, setQuery] = useState('');
 const [series, setSeries] = useState('');
 const [independentOnly,setIndependentOnly]=useState(false);
 const [limit, setLimit] = useState(pageSize);
 const [story, setStory] = useState('');

 useEffect(() => {
  const opener = document.activeElement;
  const element = dialog.current;
  element?.showModal();
  return () => {
   element?.close();
   if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  };
 }, []);

 const collectionAssets = collection === 'all' ? mixedIllustrations : creative ? creativeIllustrations : storyIllustrations;
 const matches = collectionAssets.filter(asset =>
  (!story || asset.story === story) &&
  (!creative || !independentOnly || asset.metadata.storyRelation === 'independent-event') &&
  (!creative || !series || asset.id === series || asset.metadata.seriesId === series) &&
  matchesAssetSearch(asset, query))
  .sort((a,b) => creative && series
   ? Number(a.metadata.sequenceOrder ?? 1) - Number(b.metadata.sequenceOrder ?? 1)
   : creative ? Number(b.metadata.storyRelation === 'independent-event') - Number(a.metadata.storyRelation === 'independent-event') : 0);

 return <dialog ref={dialog} className={`${dialogSurface.surface} ${styles.illustrationPicker}`}
  aria-label="삽화 고르기" onCancel={event => {event.preventDefault(); onClose();}}
  onKeyDown={event => trapDialogTab(event, dialog.current)}>
  <header className={styles.header}><h2>삽화 고르기</h2><button onClick={onClose}>닫기</button></header>
  <div className={styles.actions} aria-label="삽화 분류" role="group">
   <button aria-pressed={collection==='all'} onClick={() => changeCollection('all')}>모든 삽화</button>
   <button aria-pressed={collection==='story'} onClick={() => changeCollection('story')}>작품 속 장면</button>
   <button aria-pressed={creative} onClick={() => changeCollection('creative')}>자유 창작</button>
  </div>
  {collection==='all'&&<p>익숙한 장면과 새 사건을 골라 원하는 순서로 이야기를 만들어 보세요.</p>}
  {creative&&<><p>원작에 없는 새로운 사건으로 이야기를 시작하거나, 익숙한 인물들을 다른 상황에서 만나 보세요.</p><label><input type="checkbox" checked={independentOnly} onChange={event=>{setIndependentOnly(event.target.checked);setLimit(pageSize);}}/>새로운 사건만 보기</label></>}
  {creative&&seriesOptions.length>0&&<label>이어지는 사건<select value={series} onChange={event=>{
   setSeries(event.target.value);
   setQuery('');
   setLimit(pageSize);
  }}><option value="">모든 사건</option>{seriesOptions.map(asset=><option key={asset.id} value={asset.id}>{assetDisplayName(asset)}</option>)}</select></label>}
  {storyOptions.length > 1 && <label>작품<select value={story} onChange={event => {setStory(event.target.value); setLimit(pageSize);}}><option value="">네 작품 모두</option>{storyOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label>}
  <label>삽화 검색<input autoFocus type="search" value={query} onChange={event => {setQuery(event.target.value); setLimit(pageSize);}}/></label>
  <p role="status" className={styles.toolHint}>{matches.length === 0 ? '찾은 삽화가 없어요.' : `삽화 ${matches.length}장`}</p>
  <div className={styles.illustrationGrid}>
   {matches.slice(0, limit).map(asset => <button key={asset.id} data-asset-id={asset.id}
    aria-pressed={value === asset.id} onClick={() => onSelect(asset.id)}>
    <img src={asset.src} alt="" loading="lazy"/><span>{creative&&series&&`${asset.metadata.sequenceOrder ?? 1}. `}{assetDisplayName(asset)}</span>{collection==='all'&&<small>{isCreative(asset)?'자유 창작':'작품 속 장면'}</small>}
   </button>)}
  </div>
  {matches.length > limit && <button onClick={() => setLimit(limit + pageSize)}>삽화 더 보기</button>}
 </dialog>;
}
