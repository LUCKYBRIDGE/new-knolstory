"use client";
/* eslint-disable @next/next/no-img-element -- catalog thumbnail preview */
import { useId,useState } from 'react';
import { assetDisplayName, resolveAsset } from '@knolstory/asset-registry';
import { AssetBrowserDialog } from './asset-browser-dialog';
import styles from './asset-browser-dialog.module.css';
import {AssetPreviewImage} from './asset-preview-image';
export type AssetPickerFieldProps = {
  allowSceneIllustrations?:boolean;
  label: string;
  /** Keep the field name for assistive tech only (the screen already says what is picked). */
  labelHidden?: boolean;
  type: 'character' | 'background'; value: string; onChange: (id: string) => void;
  chapterAssetIds?: readonly string[]; allowNone?: boolean; allowDefault?: boolean; defaultLabel?: string;
  /** Resolved default artwork for display only; value remains the authored empty selection. */
  inheritedPreviewId?: string;
};
export function AssetPickerField({ allowSceneIllustrations=false, label, labelHidden=false, type, value, onChange, chapterAssetIds, allowNone = false, allowDefault = false, defaultLabel = '장의 기본 이미지', inheritedPreviewId }: AssetPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const hintId=useId();
  const inherited = value === '' && allowDefault && !!inheritedPreviewId;
  const selected = resolveAsset(inherited ? inheritedPreviewId! : value);
  const emptyOptions=[...(allowDefault?[{value:'',label:defaultLabel}]:[]),...(allowNone?[{value:allowDefault?'__none':'',label:'이미지 없음'}]:[])];
  const actionLabel=label.endsWith('이미지')?`${label} 찾기`:`${label} 이미지 찾기`;
  const emptyLabel=emptyOptions.find(option=>option.value===value)?.label;
  const displayName=(selected?assetDisplayName(selected):undefined) ?? (inherited?'그림 자료 확인 필요':emptyLabel??(value?'그림 자료 확인 필요':'선택한 이미지 없음'));
  return <div className={styles.field}>
    <span className={labelHidden?styles.srOnly:undefined}>{label}</span>
    <button type="button" className={styles.launcher} aria-label={`${actionLabel} · ${displayName}`} aria-describedby={inherited?hintId:undefined} data-asset-value={value} data-asset-inherited={inherited?true:undefined} onClick={() => setOpen(true)}>
      {selected && <AssetPreviewImage asset={selected} />}
      <span><strong>{displayName}</strong>{inherited&&<small id={hintId}>{defaultLabel}</small>}</span>
    </button>

    {open && <AssetBrowserDialog allowSceneIllustrations={allowSceneIllustrations} emptyOptions={emptyOptions} label={label} type={type} value={value} chapterAssetIds={chapterAssetIds} onSelect={onChange} onClose={() => setOpen(false)} />}
  </div>;
}
