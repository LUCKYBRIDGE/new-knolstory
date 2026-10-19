"use client";
/* eslint-disable @next/next/no-img-element -- catalog thumbnail preview */
import { useState } from 'react';
import { assetDisplayName, resolveAsset } from '@knolstory/asset-registry';
import { AssetBrowserDialog } from './asset-browser-dialog';
import styles from './asset-browser-dialog.module.css';
export type AssetPickerFieldProps = {
  label: string; type: 'character' | 'background'; value: string; onChange: (id: string) => void;
  chapterAssetIds?: readonly string[]; allowNone?: boolean; allowDefault?: boolean; defaultLabel?: string;
};
export function AssetPickerField({ label, type, value, onChange, chapterAssetIds, allowNone = false, allowDefault = false, defaultLabel = '장의 기본 이미지' }: AssetPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = resolveAsset(value);
  const emptyOptions=[...(allowDefault?[{value:'',label:defaultLabel}]:[]),...(allowNone?[{value:allowDefault?'__none':'',label:'이미지 없음'}]:[])];
  const actionLabel=label.endsWith('이미지')?`${label} 찾기`:`${label} 이미지 찾기`;
  const emptyLabel=emptyOptions.find(option=>option.value===value)?.label;
  return <div className={styles.field}>
    <span>{label}</span>
    <button type="button" className={styles.launcher} aria-label={actionLabel} data-asset-value={value} onClick={() => setOpen(true)}>
      {selected && <img src={selected.src} alt="" loading="lazy" />}
      <span><strong>{(selected?assetDisplayName(selected):undefined) ?? (emptyLabel??(value?'그림 자료 확인 필요':'선택한 이미지 없음'))}</strong><small>썸네일로 이미지 찾기</small></span>
    </button>

    {open && <AssetBrowserDialog emptyOptions={emptyOptions} label={label} type={type} value={value} chapterAssetIds={chapterAssetIds} onSelect={onChange} onClose={() => setOpen(false)} />}
  </div>;
}
