import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,chmodSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareProduction,composeArguments} from './production-compose.mjs';

function fixture(t){const root=mkdtempSync(join(tmpdir(),'knolstory-prod-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const secrets=join(root,'secrets');return {root,secrets};}
test('creates private independent secrets once and never changes existing values',t=>{
 const {secrets}=fixture(t),first=prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets});
 assert.equal(first.KNOLSTORY_PRODUCTION_SECRET_DIR,secrets);
 assert.equal(first.KNOLSTORY_AUTH_ORIGIN,'https://story.knolquiz.com');
 assert.equal(first.KNOLSTORY_REDIRECT_FROM_ORIGIN,'https://story-next.knolquiz.com');
 const before=readFileSync(join(secrets,'db-password'),'utf8');
 assert.match(before,/^[a-f0-9]{64}\n$/);
 assert.notEqual(before,readFileSync(join(secrets,'csrf-secret'),'utf8'));
 assert.equal(prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets}).KNOLSTORY_PRODUCTION_SECRET_DIR,secrets);
 assert.equal(readFileSync(join(secrets,'db-password'),'utf8'),before);
 assert.equal(first.KAKAO_CLIENT_ID_FILE,'');
});
test('refuses symlink directories and unsafe private files without overwriting',t=>{
 const {root,secrets}=fixture(t);mkdirSync(secrets,{mode:0o700});writeFileSync(join(secrets,'db-password'),'existing',{mode:0o644});
 assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets}),/Invalid production configuration/);
 chmodSync(join(secrets,'db-password'),0o600);assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets}));
 symlinkSync(secrets,join(root,'link'));assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:join(root,'link')}));
});
test('provider pairs stay private; rejects partial, empty, symlink or world-readable provider files',t=>{
 const {root,secrets}=fixture(t);prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets});
 writeFileSync(join(secrets,'kakao-client-id'),'app-id',{mode:0o600});
 assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets}));
 writeFileSync(join(secrets,'kakao-client-secret'),'private',{mode:0o600});
 const result=prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets});
 assert.equal(result.KAKAO_CLIENT_ID_FILE,'/run/knolstory-production/kakao-client-id');
 assert.equal(result.KAKAO_CLIENT_SECRET_FILE,'/run/knolstory-production/kakao-client-secret');
 assert.equal(JSON.stringify(result).includes('private'),false);
 writeFileSync(join(secrets,'google-client-id'),'');writeFileSync(join(secrets,'google-client-secret'),'');
 assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets}));
 rmSync(join(secrets,'google-client-id'));rmSync(join(secrets,'google-client-secret'));
 symlinkSync(join(secrets,'kakao-client-id'),join(secrets,'google-client-id'));assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets}));
 assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:join(root,'relative'),KNOLSTORY_AUTH_ORIGIN:'http://example.com'}));
});
test('accepts only the production origin or explicitly selected Knolstory staging origin',t=>{
 const {secrets}=fixture(t);
 for(const origin of ['http://story.knolquiz.com','https://evil.example','https://story.knolquiz.com/','https://u:p@story.knolquiz.com','https://story.knolquiz.com/path'])assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets,KNOLSTORY_AUTH_ORIGIN:origin}));
 assert.equal(prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets,KNOLSTORY_AUTH_ORIGIN:'https://story-next.knolquiz.com'}).KNOLSTORY_AUTH_ORIGIN,'https://story-next.knolquiz.com');
 assert.equal(prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:secrets,KNOLSTORY_AUTH_ORIGIN:'https://story-next.knolquiz.com'}).KNOLSTORY_REDIRECT_FROM_ORIGIN,'');
 assert.throws(()=>prepareProduction({KNOLSTORY_PRODUCTION_SECRET_DIR:'relative'}));
});
test('fixed lifecycle actions never forward arbitrary Compose or destructive arguments',()=>{
 assert.deepEqual(composeArguments('config'),['config','--quiet']);
 assert.deepEqual(composeArguments('build'),['build','api','ingress']);
 assert.deepEqual(composeArguments('db'),['up','-d','--wait','db']);
 assert.deepEqual(composeArguments('migrate'),['run','--rm','--no-deps','migration','node','migrate.mjs']);
 assert.deepEqual(composeArguments('start'),['up','-d','--wait','api','ingress']);
 assert.deepEqual(composeArguments('status'),['ps']);
 for(const action of ['down','rm','prune','--volumes','stop','run','logs',undefined])assert.throws(()=>composeArguments(action));
});
