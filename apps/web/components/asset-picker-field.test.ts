import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {assetDisplayName,resolveAsset} from '@knolstory/asset-registry';
import {AssetPickerField,type AssetPickerFieldProps} from './asset-picker-field';
const inherited='seonnyeo.background.BG01-valley-day';
const direct='seonnyeo.background.BG02-valley-storm';
function render(patch:Partial<AssetPickerFieldProps>={}){return renderToStaticMarkup(createElement(AssetPickerField,{label:'1컷 배경',type:'background',value:'',allowDefault:true,allowNone:true,onChange:()=>{},...patch}));}
describe('inherited asset preview remains separate from authoring selection',()=>{
 it('shows the actual inherited image and name without converting default into a direct asset choice',()=>{
  const asset=resolveAsset(inherited)!;expect(asset).toBeDefined();const onChange=vi.fn();
  const html=render({inheritedPreviewId:inherited,onChange});
  expect(html).toContain(`src="${asset.src}"`);expect(html).toContain(assetDisplayName(asset));
  expect(html).toContain('장의 기본 이미지');expect(html).toContain('data-asset-value=""');expect(html).toContain('data-asset-inherited="true"');
  expect(onChange).not.toHaveBeenCalled();
 });
 it('never shows an inherited image when the cut explicitly has no background',()=>{
  const html=render({value:'__none',inheritedPreviewId:inherited});
  expect(html).toContain('이미지 없음');expect(html).toContain('data-asset-value="__none"');expect(html).not.toContain('<img');expect(html).not.toContain('data-asset-inherited');
 });
 it('keeps a direct selection independent from the inherited preview',()=>{
  const html=render({value:inherited,inheritedPreviewId:direct});
  expect(html).toContain(`data-asset-value="${inherited}"`);expect(html).toContain(assetDisplayName(resolveAsset(inherited)!));expect(html).not.toContain('data-asset-inherited');
 });
 it('ignores inherited preview data unless this field supports default selection',()=>{
  const html=render({allowDefault:false,inheritedPreviewId:inherited});
  expect(html).not.toContain('<img');expect(html).not.toContain('data-asset-inherited');
 });
 it('keeps missing inherited resources explicit instead of inventing an image',()=>{
  const html=render({inheritedPreviewId:'missing-background'});
  expect(html).toContain('그림 자료 확인 필요');expect(html).toContain('장의 기본 이미지');expect(html).not.toContain('<img');expect(html).toContain('data-asset-value=""');
 });
 it('preserves the empty default presentation when no inherited image exists',()=>{
  const html=render();expect(html).toContain('장의 기본 이미지');expect(html).not.toContain('<img');expect(html).not.toContain('data-asset-inherited');
 });
});
