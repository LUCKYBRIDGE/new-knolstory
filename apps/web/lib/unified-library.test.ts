import {describe,it,expect} from 'vitest';
import {projectOnlineShelf} from './unified-library';
import type {OnlineDocumentMetadata} from './document-api';
import type {OnlineWorkBinding} from './online-work-bindings';
const recordId='22222222-2222-4222-8222-222222222222';
const remote=(changes:Partial<OnlineDocumentMetadata>={}):OnlineDocumentMetadata=>({recordId,revision:2,format:'knolstory',clientProjectId:'project',title:'같은 제목',contentSha256:'a'.repeat(64),createdAt:1,updatedAt:2,deletedAt:null,...changes});
const binding=(changes:Partial<OnlineWorkBinding>={}):OnlineWorkBinding=>({recordId,remoteProjectId:'project',format:'knolstory',revision:1,contentSha256:'b'.repeat(64),...changes});
describe('unified personal shelf projection',()=>{
 it('joins only exact linked record identity, without claiming current content is synchronized',()=>{
  const metadata=remote(),result=projectOnlineShelf([{key:'local'}],[metadata],{local:{binding:binding(),error:false}},'knolstory');
  expect(result.byLocalKey.local).toEqual({kind:'linked',label:'온라인에도 있음',record:metadata});expect(result.remoteOnly).toEqual([]);
  expect(JSON.stringify(result)).not.toMatch(/동기화|최신/);
 });
 it('keeps same-title and same-projectID independent records separate',()=>{
  const other=remote({recordId:'33333333-3333-4333-8333-333333333333'});
  const result=projectOnlineShelf([{key:'local'}],[remote(),other],{local:{binding:binding(),error:false}},'knolstory');
  expect(result.remoteOnly).toEqual([other]);
  expect(projectOnlineShelf([{key:'local'}],[remote()],{},'knolstory')).toEqual({byLocalKey:{local:{kind:'local',label:'이 기기에 있음'}},remoteOnly:[remote()]});
 });
 it('preserves every local copy while suppressing only its duplicate online card',()=>{
  const result=projectOnlineShelf([{key:'first'},{key:'copy'}],[remote()],{first:{binding:binding(),error:false},copy:{binding:binding(),error:false}},'knolstory');
  expect(Object.keys(result.byLocalKey)).toEqual(['first','copy']);expect(result.byLocalKey.first?.kind).toBe('linked');expect(result.byLocalKey.copy?.kind).toBe('linked');expect(result.remoteOnly).toEqual([]);
 });
 it('does not infer absence or trash from a partially loaded metadata list',()=>{
  const result=projectOnlineShelf([{key:'later-page'}],[],{'later-page':{binding:binding(),error:false}},'knolstory');
  expect(result.byLocalKey['later-page']).toEqual({kind:'linked',label:'온라인 연결'});
 });
 it('keeps unknown bindings visible and does not hide potentially matching remote records',()=>{
  const result=projectOnlineShelf([{key:'corrupt'},{key:'wrong-format'}],[remote()],{corrupt:{binding:null,error:true},'wrong-format':{binding:binding({format:'shortstory'}),error:false}},'knolstory');
  expect(result.byLocalKey.corrupt).toEqual({kind:'unknown',label:'온라인 연결 확인 필요'});expect(result.byLocalKey['wrong-format']).toEqual({kind:'unknown',label:'온라인 연결 확인 필요'});expect(result.remoteOnly).toEqual([remote()]);
 });
 it('omits other formats and deleted records and deduplicates paged record IDs',()=>{
  const metadata=remote(),result=projectOnlineShelf([], [remote({format:'shortstory'}),remote({recordId:'deleted',deletedAt:10}),metadata,metadata],{},'knolstory');
  expect(result).toEqual({byLocalKey:{},remoteOnly:[metadata]});
 });
 it('uses metadata only and leaves works, records and bindings unchanged',()=>{
  const works=Object.freeze([Object.freeze({key:'local'})]),metadata=Object.freeze(remote()),records=Object.freeze([metadata]),links=Object.freeze({local:Object.freeze({binding:Object.freeze(binding()),error:false})});
  const before=JSON.stringify({works,records,links});
  const result=projectOnlineShelf(works,records,links,'knolstory');
  expect(JSON.stringify({works,records,links})).toBe(before);expect(result.byLocalKey.local?.record).toBe(metadata);
 });
 it('never reads remote snapshot bodies to render the shelf',()=>{
  const metadata=remote();Object.defineProperty(metadata,'snapshot',{get(){throw Error('Body must not be read');}});
  expect(projectOnlineShelf([], [metadata],{},'knolstory').remoteOnly).toEqual([metadata]);
  expect(projectOnlineShelf([{key:'local'}],[metadata],{local:{binding:binding(),error:false}},'knolstory').byLocalKey.local?.record).toBe(metadata);
 });
});
