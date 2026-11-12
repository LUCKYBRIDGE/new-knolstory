import {describe,expect,it} from 'vitest';
import {BUILTIN_WORKS} from './builtin-works';
import {MISSION_LIMITS} from './mission-api';
import {PROVIDED_MISSIONS,copyProvidedMission} from './provided-missions';
describe('provided missions',()=>{
 it('offers a reading mission, a three-question worksheet and a classroom activity for each provided work',()=>{
  for(const work of BUILTIN_WORKS){
   const items=PROVIDED_MISSIONS.filter(mission=>mission.storyKey===work.id);
   expect(items.map(mission=>mission.kind)).toEqual(['reading','worksheet','custom']);
   expect(items[1]!.questions.map(question=>question.id)).toEqual(['q1','q2','q3']);
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
