import qrcode from 'qrcode-generator';
export function qrPrintLayout(columns:number,rows=columns){
 if(!Number.isInteger(columns)||columns<1||columns>5||!Number.isInteger(rows)||rows<1||rows>6)throw new RangeError('가로는 1–5열, 세로는 1–6행에서 골라 주세요.');
 const sixRows=rows===6,dense=rows>=5||columns===5;
 const font=sixRows?7:columns===5?7:columns===4||rows===5?8:9;
 const gap=sixRows?0.4:dense?0.6:1,padding=sixRows?1.2:dense?1.6:2,lineHeight=sixRows?1.1:dense?1.15:1.3;
 const showHint=!sixRows,codeFontPt=sixRows?6.5:7,codeLineHeight=sixRows?1.15:1.2;
 const width=(190-(columns-1)*3)/columns,height=(252-(rows-1)*3)/rows;
 const textWidth=width-padding*2-0.6;
 // Reserve the full 40-character name and number prefix rather than truncating labels.
 const nameLines=Math.ceil(46*font*25.4/72/textWidth),textHeight=nameLines*font*25.4/72*lineHeight;
 const codeHeight=codeFontPt*25.4/72*codeLineHeight,hintHeight=showHint?6.5*25.4/72*1.2:0;
 const gapCount=showHint?3:2,safety=sixRows?1:1.6;
 const qrMm=Math.floor(Math.min(60,textWidth-1,height-textHeight-codeHeight-hintHeight-gap*gapCount-padding*2-safety));
 return {columns,rows,perPage:columns*rows,qrMm,fontPt:font,gapMm:gap,paddingMm:padding,lineHeight,showHint,codeFontPt,codeLineHeight};
}
/** A4 portrait: columns and rows may differ; square layouts remain supported. */
export function qrPrintPages<T>(cards:readonly T[],columns:number,rows=columns):T[][]{
 const {perPage}=qrPrintLayout(columns,rows);
 return Array.from({length:Math.ceil(cards.length/perPage)},(_,page)=>cards.slice(page*perPage,(page+1)*perPage));
}
/** Physical quiet zone and minimum module pitch are part of the print layout, not styling. */
export function qrPrintDensity(urls:readonly string[],qrMm:number){
 const maxModules=Math.max(21,...urls.map(url=>{const qr=qrcode(0,'M');qr.addData(url);qr.make();return qr.getModuleCount();}));
 const moduleMm=qrMm/(maxModules+8);
 return {maxModules,moduleMm,printable:moduleMm>=.5};
}
