const KST=9*60*60*1000;
export const koreaDate=(time:number)=>new Date(time+KST);
export const koreaMidnight=(year:number,month:number,day:number)=>Date.UTC(year,month-1,day)-KST;

export function schoolYear(time:number){
 const local=koreaDate(time);
 return local.getUTCFullYear()-(local.getUTCMonth()<2?1:0);
}
export const schoolYearStart=(time:number)=>koreaMidnight(schoolYear(time),3,1);
export function retentionCutoff(time:number){
 const local=koreaDate(time);
 return koreaMidnight(local.getUTCFullYear()-(local.getUTCMonth()<3?1:0),3,1);
}
