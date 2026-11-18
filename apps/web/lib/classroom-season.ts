import {koreaDate,koreaMidnight,schoolYear} from '../../../server/classroom/season-calendar';

export function classroomSeason(createdAt:number|undefined,now=Date.now()){
 const date=koreaDate(now),year=schoolYear(now);
 const archived=date.getUTCMonth()===2&&createdAt!==undefined&&schoolYear(createdAt)<year;
 const season=archived?year-1:year;
 const end=koreaMidnight(season+1,4,1);
 const today=koreaMidnight(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate());
 const reminder=archived&&[18,25].includes(date.getUTCDate())?date.getUTCDate():null;
 return {season,archived,reminder,clearsOn:`${season+1}년 4월 1일`,
  daysLeft:Math.round((end-today)/86_400_000),soon:now>=koreaMidnight(season+1,2,15)};
}

export function seasonNotice(season:ReturnType<typeof classroomSeason>,audience:'teacher'|'student'|'admin'){
 const phase=season.archived?'지난 학년 자료는 지금 보거나 내려받을 수 있어요. ':'';
 const head=`${phase}${season.season}학년도 과제와 제출물은 ${season.clearsOn}에 삭제돼요.`;
 if(audience==='teacher')return `${head} ‘학급 자료 내려받기’로 기기에 보관해 주세요.`;
 if(audience==='student')return `${head} 간직할 제출본은 작품 파일로 받아 두세요. 내 온라인 작품은 그대로 남아요.`;
 return head;
}
