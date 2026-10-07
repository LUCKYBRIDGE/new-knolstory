import { describe, expect, it } from 'vitest';
import { AUDIO_CATALOG, searchAudioAssets, resolveAudioAsset, customAudioRuntimePath } from '../src/audio';
describe('audio registry', () => {
  it('resolves stable portable built-in IDs and runtime paths', () => {
    expect(AUDIO_CATALOG.length).toBe(26);
    expect(resolveAudioAsset('audio:music:forest')?.runtimePath).toBe('assets/audio/forest.wav');
    expect(resolveAudioAsset('missing')).toBeUndefined();
    expect(customAudioRuntimePath(`audio:custom:${'a'.repeat(64)}:mp3`)).toBe(`assets/audio/${'a'.repeat(64)}.mp3`);
    expect(customAudioRuntimePath('audio:custom:../../bad:wav')).toBeUndefined();
  });
  it('finds Korean names by kind without affecting image registry', () => {
    expect(searchAudioAssets(AUDIO_CATALOG, 'music', '숲').map(item => item.id)).toEqual(['audio:music:forest','audio:music:ambience-forest']);
    expect(searchAudioAssets(AUDIO_CATALOG, 'sound', '').length).toBe(12);
    expect(searchAudioAssets(AUDIO_CATALOG, 'music', '종소리')).toEqual([]);
    const custom={...AUDIO_CATALOG[0],id:`audio:custom:${'b'.repeat(64)}:wav`};
    expect(searchAudioAssets([custom],'sound','숲')).toEqual([custom]);
  });
});
