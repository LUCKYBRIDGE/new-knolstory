import type {DisplaySize} from './story-viewport';
export type ReaderDisplayViewport=Readonly<{left:number;top:number;width:number;height:number}>;
export function isReaderDisplaySize(value:unknown):value is DisplaySize{
 if(!value||typeof value!=='object')return false;
 const size=value as DisplaySize;
 return Number.isFinite(size.width)&&Number.isFinite(size.height)&&size.width>0&&size.height>0;
}
/** Display geometry has no logical-scene aspect restriction and keeps CSS fractions. */
export function readerDisplayViewport(layout:DisplaySize,visual?:Readonly<DisplaySize&{offsetLeft:number;offsetTop:number}>|null):ReaderDisplayViewport|undefined{
 if(isReaderDisplaySize(visual)&&Number.isFinite(visual.offsetLeft)&&Number.isFinite(visual.offsetTop))return {left:visual.offsetLeft,top:visual.offsetTop,width:visual.width,height:visual.height};
 if(isReaderDisplaySize(layout))return {left:0,top:0,width:layout.width,height:layout.height};
 return undefined;
}
