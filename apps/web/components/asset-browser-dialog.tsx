"use client";
/* eslint-disable @next/next/no-img-element -- catalog thumbnail previews */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ASSET_FACETS, assetDisplayName, assetCharacterIds, facetLabel, facetValues, isSelectableAsset, resolveAsset, searchAssets, type Asset, type FacetKey } from '@knolstory/asset-registry';
import { readAssetPreferences, recordRecentAsset, toggleAssetFavorite, writeAssetPreferences, type AssetPreferences } from '../lib/asset-preferences';
import styles from './asset-browser-dialog.module.css';
type Props = { label: string; type: Asset['type']; value: string; chapterAssetIds?: readonly string[]; onSelect: (id: string) => void; onClose: () => void };
type Filters = Partial<Record<FacetKey, readonly string[]>>;
const VIEWS = [['all', '전체'], ['chapter', '장 자료'], ['favorites', '즐겨찾기'], ['recent', '최근 사용']] as const;
function Thumbnail({ asset }: { asset: Asset }) {
  return <span className={`${styles.thumbnail} ${asset.type === 'background' ? styles.background : ''}`}><img src={asset.src} alt="" loading="lazy" decoding="async" /></span>;
}
/** REFINE/reuse: story-maker@18da4fc app/components/assets/AssetBrowserDialog.tsx.
 * Preserve its pending selection, current/preview comparison, view tabs, facet toggles,
 * disjunctive facet counts, removable chips and empty-result reset. Native dialog replaces
 * the manual portal/focus trap; all images stay catalog assets, never a Web Story Stage.
 */
export function AssetBrowserDialog({ label, type, value, chapterAssetIds = [], onSelect, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<(typeof VIEWS)[number][0]>('all');
  const [filters, setFilters] = useState<Filters>({});
  const [pending, setPending] = useState(value);
  const [sameCharacter, setSameCharacter] = useState(false);
  const [initialPreferences] = useState(() => {
    try { return { preferences: readAssetPreferences(localStorage), error: '' }; }
    catch { return { preferences: { favoriteIds: [], recentIds: [] } as AssetPreferences, error: '즐겨찾기·최근 사용을 읽지 못했어요. 이번 선택은 계속할 수 있어요.' }; }
  });
  const [preferences, setPreferences] = useState<AssetPreferences>(initialPreferences.preferences);
  const [storageError, setStorageError] = useState(initialPreferences.error);
  const current = resolveAsset(value);
  const preview = resolveAsset(pending);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (element && !element.open) element.showModal();
    searchInput.current?.focus();
    return () => { element?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  const options = useMemo(() => ({ type, search, filters, view, currentAssetId: value, chapterAssetIds,
    favoriteIds: preferences.favoriteIds, recentIds: preferences.recentIds, sameCharacterAssetId: sameCharacter ? value : undefined,
  }), [type, search, filters, view, value, chapterAssetIds, preferences, sameCharacter]);
  const found = useMemo(() => searchAssets(options), [options]);
  const visibleFacets = ASSET_FACETS.filter(facet => type === 'character'
    ? !['locations', 'spaces', 'times', 'seasons', 'weather', 'moods', 'states', 'framings'].includes(facet.key)
    : !['expressions', 'actions', 'variants', 'bodyFramings', 'companionCharacterIds', 'framings'].includes(facet.key));
  function toggle(key: FacetKey, entry: string) {
    setFilters(previous => ({ ...previous, [key]: previous[key]?.includes(entry) ? previous[key]!.filter(v => v !== entry) : [...(previous[key] ?? []), entry] }));
  }
  function persist(next: AssetPreferences) {
    setPreferences(next);
    try { writeAssetPreferences(localStorage, next); setStorageError(''); }
    catch { setStorageError('즐겨찾기·최근 사용을 기기에 저장하지 못했어요. 이번 선택에는 적용돼요.'); }
  }
  function clear() { setFilters({}); setSearch(''); setView('all'); setSameCharacter(false); }
  const chips = ASSET_FACETS.flatMap(f => (filters[f.key] ?? []).map(entry => ({ key: f.key, entry })));
  const canApply = isSelectableAsset(preview) && preview.type === type;
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.shell}>
      <header className={styles.header}><div><small>이야기 그림 자료실</small><h2 id={titleId}>이미지 선택 · {label}</h2><p>적용 대상: {label}. 그림을 미리 본 뒤 적용하세요.</p></div><button type="button" aria-label="이미지 선택 닫기" onClick={onClose}>닫기</button></header>
      <div className={styles.comparison}>
        <div>{current && <Thumbnail asset={current} />}<span><small>현재 이미지</small><strong>{(current?assetDisplayName(current):undefined) ?? '없음 / 기본 이미지'}</strong>{current && !isSelectableAsset(current) && <small>이전 이미지 · 기존 사용은 보존됩니다</small>}</span></div>
        <div>{preview && <Thumbnail asset={preview} />}<span><small>선택 미리보기</small><strong>{(preview?assetDisplayName(preview):undefined) ?? '그림을 선택하세요'}</strong></span></div>
      </div>
      <div className={styles.findbar}><input ref={searchInput} type="search" aria-label="이미지 검색" placeholder="흥부 일하기, 겨울 집처럼 찾아보세요" value={search} onChange={event => setSearch(event.target.value)} />{type === 'character' && current && assetCharacterIds(current).length > 0 && <button type="button" aria-pressed={sameCharacter} onClick={() => setSameCharacter(v => !v)}>같은 인물의 다른 모습</button>}</div>
      <div className={styles.tabs} role="group" aria-label="이미지 보기">{VIEWS.map(([mode, text]) => <button type="button" key={mode} aria-pressed={view === mode} onClick={() => setView(mode)}>{text}</button>)}</div>
      <div className={styles.body}>
        <section className={styles.facets} aria-label="찾는 조건 고르기">{visibleFacets.map(facet => {
          const base = searchAssets({ ...options, currentAssetId: undefined, filters: { ...filters, [facet.key]: [] } });
          const values = [...new Set([...base.flatMap(a => facetValues(a, facet.key)), ...(filters[facet.key] ?? [])])];
          if (!values.length) return null;
          return <details key={facet.key}><summary>{facet.label}{filters[facet.key]?.length ? ` (${filters[facet.key]!.length})` : ''}</summary><div role="group" aria-label={`${facet.label} 조건`}>{values.map(entry => <button type="button" key={entry} aria-pressed={filters[facet.key]?.includes(entry) ?? false} onClick={() => toggle(facet.key, entry)}>{facetLabel(facet.key, entry)} <small>{base.filter(a => facetValues(a, facet.key).includes(entry)).length}</small></button>)}</div></details>;
        })}</section>
        {(chips.length > 0 || search || sameCharacter || view !== 'all') && <div className={styles.chips} aria-label="현재 찾는 조건">{chips.map(chip => <button type="button" key={`${chip.key}:${chip.entry}`} aria-label={`${facetLabel(chip.key, chip.entry)} 조건 해제`} onClick={() => toggle(chip.key, chip.entry)}>{facetLabel(chip.key, chip.entry)} ×</button>)}<button type="button" onClick={clear}>모두 지우기</button></div>}
        <p aria-live="polite">{found.length}개의 이미지 · 현재 저장된 이미지는 조건과 관계없이 확인할 수 있어요.</p>
        <div className={styles.grid}>{found.map(asset => <article key={asset.id} className={pending === asset.id ? styles.selected : styles.card}>
          <button type="button" className={styles.favorite} aria-label={`즐겨찾기 ${asset.label}`} aria-pressed={preferences.favoriteIds.includes(asset.id)} onClick={() => persist(toggleAssetFavorite(preferences, asset.id))}>{preferences.favoriteIds.includes(asset.id) ? '★' : '☆'}</button>
          <button type="button" className={styles.option} data-asset-id={asset.id} aria-pressed={pending === asset.id} onClick={() => setPending(asset.id)}><Thumbnail asset={asset} /><strong>{assetDisplayName(asset)}</strong><small>{asset.story}{asset.id === value ? ' · 현재 이미지' : ''}{!isSelectableAsset(asset) ? ' · 이전 이미지 (확인용)' : ''}</small></button>
        </article>)}</div>
        {!found.length && <div className={styles.empty}><strong>찾은 이미지가 없어요.</strong><p>조건을 해제하거나 다른 보기에서 찾아보세요.</p><button type="button" onClick={clear}>모두 지우기</button></div>}
      </div>
      <footer className={styles.footer}>{storageError && <p role="status">{storageError}</p>}<p>적용 전에는 현재 컷이나 장 자료를 바꾸지 않습니다.</p><div><button type="button" onClick={onClose}>취소</button><button type="button" disabled={!canApply} onClick={() => { if (canApply) { persist(recordRecentAsset(preferences, pending)); onSelect(pending); onClose(); } }}>선택한 이미지 적용</button></div></footer>
    </div>
  </dialog>;
}
