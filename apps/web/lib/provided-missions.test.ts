import {describe,expect,it} from 'vitest';
import {BUILTIN_WORKS} from './builtin-works';
import {MISSION_LIMITS} from './mission-api';
import {PROVIDED_MISSIONS,copyProvidedMission} from './provided-missions';
describe('provided missions',()=>{
 it('offers a reading mission, two 독후 활동지 per way of reading and a classroom activity for each provided work',()=>{
  for(const work of BUILTIN_WORKS){
   const items=PROVIDED_MISSIONS.filter(mission=>mission.storyKey===work.id);
   expect(items.map(mission=>mission.kind)).toEqual(['reading',...Array(6).fill('worksheet'),'custom']);
   // Two 독후 활동지 for each way of reading the work, each with 3–4 questions numbered from q1.
   const sheets=items.filter(mission=>mission.kind==='worksheet');
   for(const format of ['original','knolstory','shortstory'])expect(sheets.filter(sheet=>sheet.readingFormat===format)).toHaveLength(2);
   for(const sheet of sheets){expect(sheet.questions.length).toBeGreaterThanOrEqual(3);expect(sheet.questions.map(question=>question.id)).toEqual(sheet.questions.map((_,index)=>`q${index+1}`));expect(sheet.focus).toBeTruthy();}
   // The classic thinking sheet keeps its earlier id.
   expect(items.some(mission=>mission.providedId===`${work.id}-worksheet`&&mission.readingFormat==='original')).toBe(true);
  }
  expect(new Set(PROVIDED_MISSIONS.map(mission=>mission.providedId)).size).toBe(PROVIDED_MISSIONS.length);
 });
 it('stays inside what the server accepts and reads naturally',()=>{
  for(const mission of PROVIDED_MISSIONS){
   expect(mission.title.trim().length).toBeGreaterThan(0);expect(mission.title.length).toBeLessThanOrEqual(MISSION_LIMITS.title);
   expect(mission.description.length).toBeLessThanOrEqual(MISSION_LIMITS.text);expect(mission.criteria.length).toBeLessThanOrEqual(MISSION_LIMITS.text);
   expect(mission.questions.length).toBeLessThanOrEqual(MISSION_LIMITS.questions);
   for(const question of mission.questions)expect(question.prompt.length).toBeLessThanOrEqual(MISSION_LIMITS.prompt);
   expect(mission.description).not.toContain('(를)');
  }
  expect(PROVIDED_MISSIONS.find(mission=>mission.providedId==='rabbit-reading')!.description).toContain('별주부전을 ');
  expect(PROVIDED_MISSIONS.find(mission=>mission.providedId==='heungbu-reading')!.description).toContain('흥부와 놀부를 ');
 });
 it('copies without sharing questions with the provided original',()=>{
  const source=PROVIDED_MISSIONS.find(mission=>mission.kind==='worksheet')!,copy=copyProvidedMission(source);
  copy.questions[0]!.prompt='바꾼 질문';
  expect(source.questions[0]!.prompt).not.toBe('바꾼 질문');expect(copy).not.toHaveProperty('providedId');
 });
});
