/**
 * Classroom data runs by school season. A class opened from 1 March of year Y to the end of February of Y+1
 * belongs to season Y, and its server data is cleared on 31 March of Y+1 (Korea time).
 * Works on the device are not touched; this only tells teachers and students to save copies in time.
 */
export type ClassroomSeason=Readonly<{season:number;clearsOn:string;daysLeft:number;soon:boolean}>;
const KST=9*60*60*1000,DAY=24*60*60*1000;
export function classroomSeason(createdAt:number|undefined,now=Date.now()):ClassroomSeason{
 const opened=new Date((createdAt??now)+KST);
 const season=opened.getUTCMonth()>=2?opened.getUTCFullYear():opened.getUTCFullYear()-1;
 // The last moment of 31 March (KST) of the following year.
 const end=Date.UTC(season+1,2,31,23,59,59)-KST;
 const daysLeft=Math.max(0,Math.ceil((end-now)/DAY));
 return {season,clearsOn:`${season+1}년 3월 31일`,daysLeft,soon:daysLeft<=45};
}
export function seasonNotice(season:ClassroomSeason,audience:'teacher'|'student'|'admin'){
 const head=`${season.season}학년도 학급 자료는 ${season.clearsOn}에 정리돼요.`;
 if(audience==='teacher')return `${head} 학생 작품과 제출물은 그 전에 ‘파일 받기’로 이 기기에 저장해 두세요.`;
 if(audience==='student')return `${head} 내 작품은 그 전에 작품 파일로 이 기기에 저장해 두세요.`;
 return head;
}
