'use client';
import {useState} from 'react';
import {classroomSeason,seasonNotice} from '../../lib/classroom-season';
import styles from './classroom.module.css';
/** Reminds teachers and students to keep device copies before the season's class data is cleared. */
/** `onlyWhenSoon` keeps it off every tab until the last weeks, so it does not push the day's work down. */
export function SeasonNote({createdAt,audience,onlyWhenSoon=false}:{createdAt?:number;audience:'teacher'|'student';onlyWhenSoon?:boolean}){
 const [now]=useState(()=>Date.now());
 const season=classroomSeason(createdAt,now);
 if(onlyWhenSoon&&!season.soon)return null;
 return <p className={styles.seasonNote} data-soon={season.soon} role="note">
  <span>{seasonNotice(season,audience)}{season.soon&&<b> {season.daysLeft}일 남았어요.</b>}</span>
 </p>;
}
