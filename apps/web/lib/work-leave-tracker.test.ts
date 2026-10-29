import {describe,it,expect} from 'vitest';
import {createWorkLeaveTracker} from './work-leave-tracker';
describe('work departure protection',()=>{
 it('ignores initial content and protects edits across work switches',()=>{const t=createWorkLeaveTracker();t.observe({id:'a',text:'old'});expect(t.hasRisk()).toBe(false);t.observe({id:'a',text:'new'});t.observe({id:'b',text:'other'});expect(t.hasRisk()).toBe(true);t.saved(JSON.stringify({format:'knolstory',document:{project:{id:'a',text:'new'}}}));expect(t.hasRisk()).toBe(false);t.saved(JSON.stringify({format:'shortstory',project:{id:'b',text:'other'}}));expect(t.hasRisk()).toBe(false);});
 it('a late verified save does not clear a newer edit',()=>{const t=createWorkLeaveTracker();t.observe({id:'a',text:'old'});t.observe({id:'a',text:'new'});t.saved(JSON.stringify({format:'knolstory',document:{project:{id:'a',text:'old'}}}));expect(t.hasRisk()).toBe(true);t.saved(JSON.stringify({format:'knolstory',document:{project:{id:'a',text:'new'}}}));expect(t.hasRisk()).toBe(false);});
 it('retains unapplied input and in-flight file writes independently of the project',()=>{const t=createWorkLeaveTracker();t.observe({id:'a'});t.input();expect(t.hasRisk()).toBe(true);t.saved(JSON.stringify({project:{id:'a'}}));expect(t.hasRisk()).toBe(false);t.observe({id:'a',text:'committed'});t.saved(JSON.stringify({project:{id:'a',text:'committed'}}));expect(t.hasRisk()).toBe(false);t.saving(true);expect(t.hasRisk()).toBe(true);t.saving(false);expect(t.hasRisk()).toBe(false);});
 it('protects a resource change made while file verification is pending',()=>{const t=createWorkLeaveTracker();t.observe({id:'a'});t.saving(true);t.externalEdit();t.saved(JSON.stringify({project:{id:'a'}}));t.saving(false);expect(t.hasRisk()).toBe(true);t.saving(true);t.saved(JSON.stringify({project:{id:'a'}}));t.saving(false);expect(t.hasRisk()).toBe(false);});
 it('new works require a file even before further editing and reading another existing work stays clean',()=>{const t=createWorkLeaveTracker();t.observe({id:'read-a'});t.observe({id:'read-b'});expect(t.hasRisk()).toBe(false);t.created('new');t.observe({id:'new'});expect(t.hasRisk()).toBe(true);});
 it('registers and releases the current file operation without keeping an unmounted action',async()=>{const t=createWorkLeaveTracker();expect(await t.saveCurrent()).toBe('unavailable');const release=t.registerSave(async()=>'saved');expect(await t.saveCurrent()).toBe('saved');release();expect(await t.saveCurrent()).toBe('unavailable');});
});

it('accepts a verified file with reordered object keys while preserving authored values',()=>{
 const tracker=createWorkLeaveTracker();
 const original={id:'canonical-order',lines:[{id:'cut-1',presentation:{effects:[{durationMs:600,id:'effect',scope:'following',type:'shake'}]}}]};
 tracker.observe(original);
 tracker.observe({...original,lines:[{...original.lines[0],presentation:{effects:[{...original.lines[0].presentation.effects[0],endLineId:'cut-2'}]}}]});
 tracker.saving(true);
 tracker.saved(JSON.stringify({document:{project:{lines:[{presentation:{effects:[{type:'shake',scope:'following',id:'effect',endLineId:'cut-2',durationMs:600}]},id:'cut-1'}],id:'canonical-order'}}}));
 tracker.saving(false);
 expect(tracker.hasRisk()).toBe(false);
});

it('retains protection for different values and reordered authored arrays',()=>{
 const tracker=createWorkLeaveTracker();tracker.observe({id:'ordered-array',lines:[{id:'a',text:'before'},{id:'b',text:'second'}]});
 tracker.observe({id:'ordered-array',lines:[{id:'a',text:'after'},{id:'b',text:'second'}]});
 tracker.saved(JSON.stringify({project:{lines:[{text:'before',id:'a'},{text:'second',id:'b'}],id:'ordered-array'}}));expect(tracker.hasRisk()).toBe(true);
 tracker.saved(JSON.stringify({project:{lines:[{text:'second',id:'b'},{text:'after',id:'a'}],id:'ordered-array'}}));expect(tracker.hasRisk()).toBe(true);
 tracker.saved(JSON.stringify({project:{lines:[{text:'after',id:'a'},{text:'second',id:'b'}],id:'ordered-array'}}));expect(tracker.hasRisk()).toBe(false);
});

it('uses JSON serialization semantics for omitted optional values without reordering array items',()=>{
 const tracker=createWorkLeaveTracker();tracker.observe({id:'optional-json',optional:undefined,lines:[{text:'before',note:undefined}]});
 tracker.observe({id:'optional-json',optional:undefined,lines:[{text:'after',note:undefined}]});
 tracker.saved(JSON.stringify({project:{lines:[{text:'after'}],id:'optional-json'}}));expect(tracker.hasRisk()).toBe(false);
 tracker.observe({id:'optional-json',optional:undefined,lines:[{text:'later',note:undefined}]});
 tracker.saved(JSON.stringify({project:{id:'optional-json',lines:[{text:'after'}]}}));expect(tracker.hasRisk()).toBe(true);
});
