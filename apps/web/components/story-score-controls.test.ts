import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import type {StoryProject} from '@knolstory/story-domain';
import {ProjectScoreEditor,ChoiceScoreEditor} from './story-score-controls';
it('names the actual chapter and cut when a score prevents deletion',()=>{
 const source=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8')) as StoryProject;
 const project:StoryProject={...source,chapters:[{...source.chapters[0],id:'one',order:1,title:'출발'},{...source.chapters[0],id:'two',order:2,title:'도착'}],scores:[{id:'trust',name:'신뢰',description:'',initial:0}],lines:source.lines.slice(0,2).map((line,index)=>({...line,chapterId:index===0?'one':'two',order:1,flow:index===0?{type:'goto',targetLineId:null}:{type:'goto',targetLineId:null,routes:[{id:'r',targetLineId:null,condition:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:1}]}}]}}))};
 const html=renderToStaticMarkup(createElement(ProjectScoreEditor,{project,onProjectChange:()=>{}}));
 expect(html).toContain('도착');expect(html).toContain('1컷');
});

it('does not describe hidden choice conditions as available editing tools',()=>{
 const html=renderToStaticMarkup(createElement(ChoiceScoreEditor,{scores:[],label:'선택 1',conditionsEnabled:false,onChange:()=>{}}));
 expect(html).not.toContain('표시 조건');expect(html).toContain('아래에 정한 점수 변화');
});
