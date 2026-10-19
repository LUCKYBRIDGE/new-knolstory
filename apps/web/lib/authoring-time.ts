/** Display seconds without changing the document's integer millisecond contract. */
export function millisecondsToSeconds(milliseconds:number):string {
  return String(milliseconds/1000);
}
export function secondsToMilliseconds(draft:string,minMs=0,maxMs=10000,currentMs?:number):number|null {
  const value=draft.trim();
  // Existing documents allow fractional milliseconds. Merely focusing/blurring
  // their displayed value must never round or change the authored duration.
  if(currentMs!==undefined&&Number.isFinite(currentMs)&&currentMs>=minMs&&currentMs<=maxMs&&value===millisecondsToSeconds(currentMs))return currentMs;
  if(!/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(value))return null;
  const milliseconds=Math.round(Number(value)*1000);
  return Number.isSafeInteger(milliseconds)&&milliseconds>=minMs&&milliseconds<=maxMs?milliseconds:null;
}
