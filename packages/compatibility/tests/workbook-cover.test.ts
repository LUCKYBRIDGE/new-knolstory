import type { AuthoringTables } from '../src/authoring-workbook/model';
const mutable=(t:AuthoringTables)=>structuredClone(t) as Record<string,{headers:string[];rows:string[][]}>;
import { expect,it } from 'vitest';
import { DEFAULT_COVER,type CoverDesign } from '@knolstory/story-domain';
import { getRepresentativeStory } from '../src/index';
import { exportCoverTables,readCoverTables,exportCoverDesignTables,readCoverDesignTables } from '../src/authoring-workbook/cover';
const design:CoverDesign={version:1,trim:'trade-300-435',finish:{stock:'matte',color:'#112233',ink:'#ffffff',accent:'#aaaaaa',texture:'none'},band:{enabled:true,designId:'cream'},faces:{front:{preset:'poster',elements:[{id:'text1',type:'text',role:'custom',region:'face',content:{text:'한글\n😀'},box:{x:0,y:0,w:.5,h:.5},style:{fontId:'sans',fontSize:.1,color:'#ffffff',align:'center',writing:'horizontal'}}]},spine:{preset:'cloth',elements:[]},back:{preset:'literary',elements:[]}}};
it('roundtrips cover design including empty faces and literal content and applies edits',()=>{
 const p=getRepresentativeStory('rabbit').project,source={...p,cover:{...DEFAULT_COVER,design}};
 const t=exportCoverTables(source);expect(readCoverTables(t,p)).toEqual(source);
 const edited=mutable(t);edited.coverTextLayers.rows[0][edited.coverTextLayers.headers.indexOf('text')]='새 글';
 expect(readCoverTables(edited,p).cover?.design?.faces.front.elements[0]).toMatchObject({content:{text:'새 글'}});
 expect(readCoverDesignTables(exportCoverDesignTables(design))).toEqual(design);
 expect(readCoverDesignTables(exportCoverDesignTables())).toBeUndefined();
});
it('rejects duplicate layers and orphan face owners',()=>{
 const t=exportCoverDesignTables(design);expect(()=>readCoverDesignTables({...t,coverTextLayers:{...t.coverTextLayers,rows:[...t.coverTextLayers.rows,...t.coverTextLayers.rows]}})).toThrow();
 const b=mutable(t);b.coverTextLayers.rows[0][0]='missing';expect(()=>readCoverDesignTables(b)).toThrow();
});
it('preserves all scalar/composition/image/crop fields and combined layer order independent of sheet row order',()=>{
 const p=getRepresentativeStory('rabbit').project;
 const image={id:'scene',type:'image' as const,role:'scene' as const,assetId:'bg-rabbit-sea',assetType:'background' as const,box:{x:0,y:.1,w:.8,h:.8},frame:'oval' as const,crop:{fit:'cover' as const,zoom:1.3,x:42,y:57}};
 const d={...design,faces:{...design.faces,front:{...design.faces.front,elements:[image,{...design.faces.front.elements[0],id:'bound',content:{bind:'project.title' as const}}]}}};
 // The generic design helper validates layout; project cover additionally validates catalog references.
 const t=exportCoverDesignTables(d);expect(readCoverDesignTables(t)).toStrictEqual(d);
 const edited=mutable(t);edited.coverTextLayers.rows[0][edited.coverTextLayers.headers.indexOf('position')]='0';edited.coverImageLayers.rows[0][edited.coverImageLayers.headers.indexOf('position')]='1';
 expect(readCoverDesignTables(edited)?.faces.front.elements.map(e=>e.id)).toEqual(['bound','scene']);
 const comp={version:1 as const,backgroundFit:'complete' as const,backgroundX:32,backgroundY:72,backgroundZoom:1.2,characterX:55,characterBottom:12,characterScale:.8,titleX:45,titleY:30,titleWidth:70,showEdition:false,textPanel:'none' as const};
 const source={...p,cover:{...DEFAULT_COVER,author:'001',subtitle:'=테스트',authorNote:'\t\n😀',presetId:'arch' as const,composition:comp}};
 expect(readCoverTables(exportCoverTables(source),p)).toStrictEqual(source);
});
it('adds/deletes layers and rejects inconsistent contents and unsupported versions',()=>{
 const t=mutable(exportCoverDesignTables(design));
 const newRow=[...t.coverTextLayers.rows[0]];newRow[t.coverTextLayers.headers.indexOf('id')]='new';newRow[t.coverTextLayers.headers.indexOf('position')]='1';t.coverTextLayers.rows.push(newRow);
 expect(readCoverDesignTables(t)?.faces.front.elements).toHaveLength(2);
 t.coverTextLayers.rows=[];expect(readCoverDesignTables(t)?.faces.front.elements).toEqual([]);
 t.coverDesign.rows[0][t.coverDesign.headers.indexOf('version')]='2';expect(()=>readCoverDesignTables(t)).toThrow();
 const bad=mutable(exportCoverDesignTables(design));bad.coverTextLayers.rows[0][bad.coverTextLayers.headers.indexOf('bind')]='project.title';expect(()=>readCoverDesignTables(bad)).toThrow(/내용 방식/);
});
