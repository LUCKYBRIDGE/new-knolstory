'use client';
import {useState} from 'react';
import {classroomSeason,seasonNotice} from '../../lib/classroom-season';
import styles from './classroom.module.css';
/** Reminds teachers and students to keep device copies before the season's class data is cleared. */
export function SeasonNote({createdAt,audience}:{createdAt?:number;audience:'teacher'|'student'}){
 const [now]=useState(()=>Date.now());
 const season=classroomSeason(createdAt,now);
 return <p className={styles.seasonNote} data-soon={season.soon} role="note">
  <span>{seasonNotice(season,audience)}{season.soon&&<b> {season.daysLeft}일 남았어요.</b>}</span>
 </p>;
}
