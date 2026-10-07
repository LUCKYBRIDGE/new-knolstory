"use client";
/* eslint-disable @next/next/no-img-element -- catalog thumbnail preview */
import { useState } from 'react';
import { ASSET_CATALOG, assetDisplayName, resolveAsset } from '@knolstory/asset-registry';
import { AssetBrowserDialog } from './asset-browser-dialog';
import styles from './asset-browser-dialog.module.css';
export type AssetPickerFieldProps = {
  label: string; type: 'character' | 'background'; value: string; onChange: (id: string) => void;
  chapterAssetIds?: readonly string[]; allowNone?: boolean; allowDefault?: boolean; defaultLabel?: string;
};
export function AssetPickerField({ label, type, value, onChange, chapterAssetIds, allowNone = false, allowDefault = false, defaultLabel = '장의 기본 이미지' }: AssetPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = resolveAsset(value);
  return <div className={styles.field}>
    <span>{label}</span>
    <button type="button" className={styles.launcher} aria-label={`${label} 이미지 찾기`} onClick={() => setOpen(true)}>
      {selected && <img src={selected.src} alt="" loading="lazy" />}
      <span><strong>{(selected?assetDisplayName(selected):undefined) ?? (value === '__none' ? '이미지 없음' : value === '' ? allowDefault ? defaultLabel : '선택한 이미지 없음' : value)}</strong><small>썸네일로 이미지 찾기</small></span>
    </button>
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
      {allowDefault && <option value="">{defaultLabel}</option>}
      {!allowDefault && <option value="">{allowNone ? '없음' : '이미지 선택'}</option>}
      {ASSET_CATALOG.filter(asset => asset.type === type).map(asset => <option key={asset.id} value={asset.id}>{asset.label}</option>)}
      {allowNone && allowDefault && <option value="__none">없음</option>}
    </select>
    {open && <AssetBrowserDialog label={label} type={type} value={value} chapterAssetIds={chapterAssetIds} onSelect={onChange} onClose={() => setOpen(false)} />}
  </div>;
}
