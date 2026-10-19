/** Shift a decimal spelling without floating point arithmetic or rounding author values. */
export function shiftDecimal(text:string,places:number):string {
 const match=/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
 if(!match)throw new Error('올바른 십진수 시간이 아닙니다.');
 const [,sign,whole,fraction='',exponent='0']=match;
 const digits=whole+fraction,point=whole.length+Number(exponent)+places;
 const shifted=point<=0?`0.${'0'.repeat(-point)}${digits}`:point>=digits.length?`${digits}${'0'.repeat(point-digits.length)}`:`${digits.slice(0,point)}.${digits.slice(point)}`;
 const normalized=shifted.replace(/^0+(?=\d)/,'').replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
 return `${sign==='-'&&Number(normalized)!==0?'-':''}${normalized}`;
}
