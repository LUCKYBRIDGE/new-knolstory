import { parseStoryDocument, type StoryDocumentEnvelope, type Chapter, type StoryLine } from '@knolstory/story-domain';

/** Next tables are editable projections; chunked payload retains every unexposed field. */
export type StoryTableArchive = { document: StoryDocumentEnvelope; audioResources: unknown[] };
export const TABLE_CELL_LIMIT = 30000;
export const TABLE_MAX_BYTES = 25 * 1024 * 1024;
const HEADER = ['kind','id','chapterId','order','title','speakerName','text','backgroundId','leftAssetId','rightAssetId','type','speaker','flow','audio','presentation','stageComposition','chapterNumber','branchLabel'];
export function tablePayload(format: string, value: unknown): string[][] {
  const payload = JSON.stringify(value);
  if (new TextEncoder().encode(payload).length > TABLE_MAX_BYTES) throw new Error('표 자료는 전체 25MB 이하로 보관할 수 있어요.');
  const chunks:string[][]=[];for(let start=0;start<payload.length;){let end=Math.min(payload.length,start+TABLE_CELL_LIMIT-5);if(end<payload.length&&/[\uD800-\uDBFF]/.test(payload[end-1]))end--;chunks.push(['payload',String(chunks.length),'json:'+payload.slice(start,end),'json-prefix-v1']);start=end;}
  return [['knolstory-next-table','1',format],HEADER,...chunks];
}
export function readTablePayload(rows: readonly (readonly string[])[], format: string): unknown {
  if (rows[0]?.[0] !== 'knolstory-next-table' || rows[0][1] !== '1' || rows[0][2] !== format) throw new Error('지원하는 Next 표 형식과 버전을 확인해 주세요.');
  if (JSON.stringify(rows).length > TABLE_MAX_BYTES * 2) throw new Error('표 자료가 너무 큽니다.');
  if(rows.slice(2).some(row=>row.length&& !['payload','project','chapter','cut','page'].includes(row[0])))throw new Error('지원하지 않는 표 행이 있습니다. 내용을 버리지 않고 가져오기를 중단했어요.');
  const parts = rows.filter(row => row[0] === 'payload');
  if (!parts.length || parts.some((row, i) => row[1] !== String(i))) throw new Error('보존 자료가 없거나 순서가 바뀌었습니다. 원본 표를 다시 선택하세요.');
  try { return JSON.parse(parts.map(row => row[3]==='json-prefix-v1' ? (row[2]?.startsWith('json:')?row[2].slice(5):(()=>{throw new Error('보존 자료 인코딩을 확인하세요.');})()) : row[2] ?? '').join('')); } catch { throw new Error('표의 보존 자료를 읽지 못했습니다.'); }
}
const json = (value: unknown) => value === undefined ? '' : JSON.stringify(value);
export function exportStoryTable(document: StoryDocumentEnvelope, audioResources: readonly unknown[] = []): string[][] {
  const loaded = parseStoryDocument(document);
  if (!loaded.ok) throw new Error('작품 문서를 먼저 확인해 주세요.');
  const checked = loaded.document;
  const rows = [...tablePayload('knolstory', { document: checked, audioResources }),
    ['project', checked.project.id, '', '', checked.project.title, '', checked.project.description],
    ...checked.project.chapters.map(ch => ['chapter', ch.id, '', String(ch.order), ch.title, '', ch.summary, ch.backgroundId, ch.leftAssetId, ch.rightAssetId, '', '', '', json(ch.audio),'','',String(ch.chapterNumber??''),ch.branchLabel??'']),
    ...checked.project.lines.map(cut => ['cut', cut.id, cut.chapterId, String(cut.order), cut.workingTitle ?? '', cut.speakerName, cut.text, cut.backgroundId, cut.leftAssetId, cut.rightAssetId, cut.type, cut.speaker, json(cut.flow), json(cut.audio), json(cut.presentation), json(cut.stageComposition)])];
  if (rows.some(row => row.some(cell => cell.length > TABLE_CELL_LIMIT))) throw new Error('편집할 한 셀의 내용은 30,000자 이하로 줄여 주세요. 작품 파일에는 전체 내용을 보관할 수 있어요.');
  return rows;
}
function parseCell(value: string | undefined): unknown {
  if (!value) return undefined;
  try { return JSON.parse(value); } catch { throw new Error('분기·음악·연출 JSON 셀의 문법을 확인해 주세요.'); }
}
function order(value: string | undefined): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('장과 컷 순서는 1 이상의 정수여야 해요.');
  return number;
}
function uniqueRows(rows: readonly (readonly string[])[], kind: string) {
  const selected = rows.filter(row => row[0] === kind);
  if (selected.some(row => !row[1]?.trim()) || new Set(selected.map(row => row[1])).size !== selected.length) throw new Error('장과 컷 ID는 비어 있거나 중복될 수 없어요.');
  return selected;
}
export function importStoryTable(rows: readonly (readonly string[])[]): StoryTableArchive {
  const raw = readTablePayload(rows, 'knolstory') as StoryTableArchive;
  const loaded = parseStoryDocument(raw?.document);
  if (!loaded.ok || !Array.isArray(raw.audioResources)) throw new Error('표 안의 작품 보존 자료가 올바르지 않아요.');
  const projectRows = uniqueRows(rows, 'project');
  if (projectRows.length !== 1 || projectRows[0][1] !== loaded.document.project.id) throw new Error('작품 행과 ID를 확인해 주세요.');
  const project = loaded.document.project;
  const chapters = uniqueRows(rows, 'chapter').map(row => {
    const original = project.chapters.find(ch => ch.id === row[1]);
    const base: Chapter = original ?? { id:row[1], order:1, title:'',summary:'',purpose:'',mood:'',keyEvents:'',nextChapterIdea:'',storyStageKeys:[],chapterSpeakerNames:[],characterAssetIds:[],backgroundAssetIds:[],backgroundId:'',leftAssetId:'',rightAssetId:'' };
    return { ...base, order:order(row[3]), title:row[4] ?? '', summary:row[6] ?? '', backgroundId:row[7] ?? '', leftAssetId:row[8] ?? '', rightAssetId:row[9] ?? '', audio:parseCell(row[13]),...(row[16]!==undefined?{chapterNumber:row[16]?order(row[16]):undefined}:{}),...(row[17]!==undefined?{branchLabel:row[17]||undefined}:{}) };
  });
  const lines = uniqueRows(rows, 'cut').map(row => {
    const original = project.lines.find(cut => cut.id === row[1]);
    const base: StoryLine = original ?? { id:row[1],chapterId:row[2],order:1,type:'narration',speaker:'narration',speakerName:'',text:'',leftAssetId:'',rightAssetId:'',backgroundId:'',purposeNote:'',emotionNote:'',directionNote:'' };
    return { ...base, chapterId:row[2], order:order(row[3]), ...(row[4] || base.workingTitle !== undefined ? { workingTitle:row[4] ?? '' } : {}), speakerName:row[5] ?? '', text:row[6] ?? '', backgroundId:row[7] ?? '',leftAssetId:row[8] ?? '',rightAssetId:row[9] ?? '', type:row[10] ?? 'narration',speaker:row[11] ?? 'narration',flow:parseCell(row[12]),audio:parseCell(row[13]),presentation:parseCell(row[14]),stageComposition:parseCell(row[15]) };
  });
  const result = parseStoryDocument({ ...loaded.document, project:{ ...project, title:projectRows[0][4] ?? '', description:projectRows[0][6] ?? '', chapters, lines } });
  if (!result.ok) throw new Error(result.issues.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
  return { document:result.document, audioResources:structuredClone(raw.audioResources) };
}
function serializeDelimited(rows: readonly (readonly string[])[], delimiter:string):string {
  return rows.map(row=>row.map(value=>{
    const cell=/^\s*[=+@\-']/.test(value)?`'${value}`:value;
    return cell.includes(delimiter)||/[\r\n"]/.test(cell)?`"${cell.replaceAll('"','""')}"`:cell;
  }).join(delimiter)).join('\n');
}
export function serializeTableTsv(rows: readonly (readonly string[])[]): string { return serializeDelimited(rows,'\t'); }
export function serializeTableCsv(rows: readonly (readonly string[])[]): string { return serializeDelimited(rows,','); }
export function parseTableTsv(text:string):string[][] { return parseDelimited(text,'\t'); }
export function parseTableCsv(text:string):string[][] { return parseDelimited(text,','); }
function parseDelimited(text: string, delimiter:string): string[][] {
  text=text.replace(/^\uFEFF/,'');
  if (new TextEncoder().encode(text).length > TABLE_MAX_BYTES * 2) throw new Error('표 자료가 너무 큽니다.');
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false;
  for (let i=0;i<text.length;i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i+1] === '"') { cell += '"'; i++; } else if (ch === '"') { quoted=false;closed=true; } else cell+=ch; continue; }
    if (ch === '"' && !cell && !closed) { quoted=true;continue; }
    if (ch === delimiter || ch === '\n' || ch === '\r') { row.push(cell);cell='';closed=false; if(ch !== delimiter) { rows.push(row);row=[]; if(ch==='\r'&&text[i+1]==='\n')i++; } continue; }
    if (closed) throw new Error('닫힌 따옴표 뒤에는 셀 구분자가 필요해요.');
    cell+=ch;
  }
  if (quoted) throw new Error('표의 따옴표가 닫히지 않았어요.');
  if (cell || row.length || closed) { row.push(cell);rows.push(row); }
  return rows.map(row=>row.map(cell=>/^'\s*[=+@\-']/.test(cell)?cell.slice(1):cell));
}
/** Public one-sheet TSV only; no credentials or arbitrary network targets. */
export function googleSheetTsvUrl(input: string): string {
  let url: URL; try { url=new URL(input); } catch { throw new Error('공개 Google 시트 주소를 입력하세요.'); }
  if(url.protocol!=='https:' || url.hostname!=='docs.google.com' || url.username || url.password) throw new Error('공개 Google 시트 주소를 입력하세요.');
  const match=url.pathname.match(/^\/spreadsheets\/d\/(e\/)?([A-Za-z0-9_-]+)(?:\/|$)/);
  if(!match) throw new Error('Google 시트 주소를 확인하세요.');
  const gid = url.searchParams.get('gid') ?? new URLSearchParams(url.hash.slice(1)).get('gid') ?? '0';
  if(!/^\d+$/.test(gid)) throw new Error('시트 탭 번호를 확인하세요.');
  return match[1] ? `https://docs.google.com/spreadsheets/d/e/${match[2]}/pub?output=tsv&gid=${gid}` : `https://docs.google.com/spreadsheets/d/${match[2]}/export?format=tsv&gid=${gid}`;
}
