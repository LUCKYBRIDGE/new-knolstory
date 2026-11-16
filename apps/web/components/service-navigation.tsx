'use client';
import {serviceLinks,type ServiceSection} from '../lib/service-navigation';
import type {ClassroomRoleState} from './use-classroom-me';
import styles from './service-navigation.module.css';
export function ServiceNavigation({role,active,beforeNavigate}:{role:ClassroomRoleState;active:ServiceSection|null;beforeNavigate?:()=>boolean}){
 const links=serviceLinks(role),teacher=role==='teacher'||role==='admin';
 // A bar with one tab is not a choice; guests and members reach the library from the page itself.
 if(links.length<2&&!teacher)return null;
 return <div className={styles.bar}><nav className={styles.tabs} aria-label="주 메뉴">{links.map(link=><a key={link.section} href={link.href} aria-current={active===link.section?'page':undefined} onClick={event=>{if(beforeNavigate?.()===false)event.preventDefault();}}>{link.label}</a>)}</nav>
  {teacher&&<a className={styles.settings} href="/teacher?tab=settings" aria-current={active==='settings'?'page':undefined} onClick={event=>{if(beforeNavigate?.()===false)event.preventDefault();}}><span aria-hidden="true">⚙</span> 학급 설정</a>}
 </div>;
}
