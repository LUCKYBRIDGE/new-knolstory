import {expect,it} from 'vitest';
import {catalogBranchNarrativeChanges} from '../src/catalog-branch-narrative';
import {classicStories,representativeStories,resolveProvidedCatalogStory} from '../src';

// Every later wording change must reach the text readers see; a stale "from" would silently do nothing.
it('applies every catalog narrative change to the published text',()=>{
 const missed:string[]=[];
 for(const entry of [...representativeStories,...classicStories]){
  const changes=catalogBranchNarrativeChanges[entry.project.id];if(!changes)continue;
  const project=resolveProvidedCatalogStory(entry.project);
  for(const [id,[,to]] of Object.entries(changes))if(project.lines.find(line=>line.id===id)?.text!==to)missed.push(`${project.id}/${id}`);
 }
 expect(missed).toEqual([]);
});
