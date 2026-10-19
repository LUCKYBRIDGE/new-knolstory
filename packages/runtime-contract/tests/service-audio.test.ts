import {it,expect} from 'vitest';
import {isRuntimeAudioPath,isRuntimeServiceAudioPath,isRuntimeServiceAudioResources} from '../src/audio';
const path='assets/audio/cc0/oga-aquaria/v1/tylersong3-normal.ogg';
it('accepts versioned catalogue audio without admitting traversal or external paths',()=>{
 expect(isRuntimeAudioPath(path)).toBe(true);expect(isRuntimeServiceAudioPath(path)).toBe(true);
 for(const value of ['assets/audio/cc0/../v1/a.ogg','assets/audio/cc0/a/v0/b.ogg','assets/audio/cc0/a/v1/../b.ogg','https://host/a.ogg','assets/audio/forest.wav'])expect(isRuntimeServiceAudioPath(value)).toBe(false);
 expect(isRuntimeAudioPath('assets/audio/forest.wav')).toBe(true);
});
it('binds service byte delivery to referenced scene paths and validates hashes and size',()=>{
 const resource={path,sha256:'a'.repeat(64),mime:'audio/ogg',data:'T2dnUw=='};
 expect(isRuntimeServiceAudioResources([resource],[path])).toBe(true);expect(isRuntimeServiceAudioResources(undefined,[path])).toBe(true);
 for(const resources of [[{...resource,path:'assets/audio/cc0/a/v1/other.ogg'}],[{...resource,sha256:'invalid'}],[resource,resource],[{...resource,data:'!'}],[{...resource,mime:'audio/wav'}],[{...resource,data:'a'.repeat(12000001)}]])expect(isRuntimeServiceAudioResources(resources,[path])).toBe(false);
});
