import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {decodeAuthoringArchive,prepareJsonbSnapshot} from '../../../../../packages/compatibility/src/authoring-archive';
import {checkedSnapshot} from '../../../../../server/documents/validation';
const text=await readFile('.cache/account-upload-fixture-20261104.knolstory','utf8'),archive=await decodeAuthoringArchive(text),snapshot=await prepareJsonbSnapshot(archive),checked=await checkedSnapshot(snapshot);
if(!isDeepStrictEqual(snapshot,checked))throw Error('Current server validator changed prepared fixture.');
const path='docs/architecture/evidence/account-device-readiness-2026-11-04/upload-fixture.json',report=JSON.parse(await readFile(path,'utf8'));
report.currentServerSnapshotValidationPassed=true;report.compactSnapshotBytes=Buffer.byteLength(JSON.stringify(snapshot));report.limits.push('Local current server validator only; deployed authenticated request and UI-generated independent ID remain untested.');
await writeFile(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({currentServerValidatorPassed:true,compactSnapshotBytes:report.compactSnapshotBytes,serverRequestSent:false}));
