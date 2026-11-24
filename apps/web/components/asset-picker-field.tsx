"use client";
import { useState } from 'react';
import { assetDisplayName, resolveAsset } from '@knolstory/asset-registry';
import { AssetBrowserDialog } from './asset-browser-dialog';
import styles from './asset-browser-dialog.module.css';
import {AssetPreviewImage} from './asset-preview-image';
import {FocusSurface} from './a2ui/focus-surface';
import {assetPickerSurface,PICKER_EVENT} from './a2ui/editor-surfaces';
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
  const inherited = value === '' && allowDefault && !!inheritedPreviewId;
  const selected = resolveAsset(inherited ? inheritedPreviewId! : value);
  const emptyOptions=[...(allowDefault?[{value:'',label:defaultLabel}]:[]),...(allowNone?[{value:allowDefault?'__none':'',label:'이미지 없음'}]:[])];
  const actionLabel=label.endsWith('이미지')?`${label} 찾기`:`${label} 이미지 찾기`;
  const emptyLabel=emptyOptions.find(option=>option.value===value)?.label;
  const displayName=(selected?assetDisplayName(selected):undefined) ?? (inherited?'그림 자료 확인 필요':emptyLabel??(value?'그림 자료 확인 필요':'선택한 이미지 없음'));
  // A2UI: the field is the catalog's AssetPicker; the thumbnail is the custom AssetThumbnail drawn by AssetPreviewImage.
  const surface=assetPickerSurface({kind:type,label,labelVisible:!labelHidden,name:displayName,assetValue:value,assetId:selected?.id,inherited,hint:inherited?defaultLabel:undefined});
  return <>
    <FocusSurface inline surface={surface} rootId="picker" device="tablet" attrs={component=>component.id==='picker'?{className:styles.field}:undefined}
      skin={{pickerButton:styles.launcher,srOnly:styles.srOnly,pickerLabel:''}}
      custom={{AssetThumbnail:component=>{const asset=resolveAsset(String(component.assetId));return asset?<AssetPreviewImage asset={asset}/>:null;}}}
      onAction={({action})=>{if('event' in action&&action.event.name===PICKER_EVENT)setOpen(true);}}/>
    {open && <AssetBrowserDialog allowSceneIllustrations={allowSceneIllustrations} emptyOptions={emptyOptions} label={label} type={type} value={value} chapterAssetIds={chapterAssetIds} onSelect={onChange} onClose={() => setOpen(false)} />}
  </>;
}
