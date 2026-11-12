import {it,expect} from 'vitest';
import {missionInput,missionSubmission,missionReview} from './mission-contract';
const create={title:'독후 활동',description:'첫 줄\n둘째 줄',criteria:'까닭을 써요.',kind:'worksheet',storyKey:'rabbit',readingFormat:'original',questions:[{id:'q1',prompt:'왜 그렇게 생각했나요?'}]};
it('validates plain mission content and keeps multiline prose',()=>{
 expect(missionInput(create)).toEqual(create);
 for(const patch of [{title:' '},{kind:'score'},{storyKey:'other'},{readingFormat:'video'},{questions:[]},{questions:[{id:'__proto__',prompt:'x'}]},{extra:true}])expect(()=>missionInput({...create,...patch})).toThrow();
});
it('requires every response and rejects unrelated answer keys',()=>{
 expect(missionSubmission({answers:{q1:'근거\n문장'},note:''},create.questions)).toEqual({answers:{q1:'근거\n문장'},note:''});
 for(const value of [{answers:{},note:''},{answers:{q1:' '},note:''},{answers:{q1:'x',q2:'y'},note:''},{answers:{q1:'x'},note:'',passed:true}])expect(()=>missionSubmission(value,create.questions)).toThrow();
});
it('requires a revision explanation and a version for teacher review',()=>{
 expect(missionReview({reviewStatus:'passed',feedback:'',expectedSubmittedAt:null})).toEqual({reviewStatus:'passed',feedback:'',expectedSubmittedAt:null});
 for(const value of [{reviewStatus:'revise',feedback:' ',expectedSubmittedAt:null},{reviewStatus:'passed',feedback:''},{reviewStatus:'passed',feedback:'',expectedSubmittedAt:-1}])expect(()=>missionReview(value)).toThrow();
});
