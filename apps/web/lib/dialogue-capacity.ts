/** An editor writing aid, not a runtime pagination decision or text-length limit. */
export type DialogueCapacityReference={
 bodyWidthPx:number;
 bodyHeightPx:number;
 fontPx:number;
 lineHeightPx:number;
};
export type DialogueCapacityEstimate={
 characterCount:number;
 manualBreaks:number;
 columnsPerLine:number;
 lineCount:number;
 lineBudget:number;
 estimatedPages:number;
 overflow:boolean;
};
// Writing references only: 1280 × 720 and 720 × 1280 logical stages,
// 32 px body type, 48 px line pitch, approximate 64/40 px side insets.
// These approximate the fixed reference pagination; reader font preferences never change page contents.
export const LANDSCAPE_DIALOGUE_REFERENCE:Readonly<DialogueCapacityReference>={
 bodyWidthPx:1152,bodyHeightPx:48*3,fontPx:32,lineHeightPx:48,
};
export const PORTRAIT_DIALOGUE_REFERENCE:Readonly<DialogueCapacityReference>={
 bodyWidthPx:640,bodyHeightPx:48*5,fontPx:32,lineHeightPx:48,
};
const graphemes=new Intl.Segmenter('ko',{granularity:'grapheme'});
const halfWidth=/^[\u0020-\u007e\uFF61-\uFFDC]+$/u;
function approximateColumns(grapheme:string):number{
 return halfWidth.test(grapheme)?.5:1;
}
export function estimateDialogueCapacity(text:string,reference:DialogueCapacityReference=PORTRAIT_DIALOGUE_REFERENCE):DialogueCapacityEstimate{
 for(const value of Object.values(reference)){
  if(!Number.isFinite(value)||value<=0)throw new RangeError('Dialogue reference dimensions must be positive finite numbers.');
 }
 const columnsPerLine=Math.max(1,Math.floor(reference.bodyWidthPx/reference.fontPx));
 const lineBudget=Math.max(1,Math.floor(reference.bodyHeightPx/reference.lineHeightPx));
 // CRLF is one author-entered line break; original manuscript is never rewritten.
 const segments=Array.from(graphemes.segment(text),part=>part.segment);
 let lineCount=1,usedColumns=0,manualBreaks=0;
 for(const segment of segments){
  if(segment==='\n'||segment==='\r'||segment==='\r\n'){
   manualBreaks+=1;lineCount+=1;usedColumns=0;continue;
  }
  const width=segment==='\t'?2-usedColumns%2:approximateColumns(segment);
  if(usedColumns+width>columnsPerLine){lineCount+=1;usedColumns=0;}
  usedColumns+=Math.min(width,columnsPerLine);
 }
 return {characterCount:segments.length,manualBreaks,columnsPerLine,lineCount,lineBudget,
  estimatedPages:Math.max(1,Math.ceil(lineCount/lineBudget)),overflow:lineCount>lineBudget};
}
