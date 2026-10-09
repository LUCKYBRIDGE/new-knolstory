import storyScore from './story-score.json';
/** Audio is separate from the image catalogue; both use stable asset IDs. */
export type AudioAsset = Readonly<{ id: string; name: string; kind: 'music' | 'sound'; src: string; runtimePath: string; mime: string; durationSeconds?: number }>;
export const AUDIO_CATALOG: readonly AudioAsset[] = Object.freeze([
  { id: 'audio:music:forest', name: '숲의 아침 · 잔잔한 배경음', kind: 'music', src: '/assets/audio/forest.wav', runtimePath: 'assets/audio/forest.wav', mime: 'audio/wav', durationSeconds: 8 },
  { id: 'audio:music:night', name: '밤의 길 · 차분한 배경음', kind: 'music', src: '/assets/audio/night.wav', runtimePath: 'assets/audio/night.wav', mime: 'audio/wav', durationSeconds: 8 },
  { id: 'audio:sound:chime', name: '맑은 종소리', kind: 'sound', src: '/assets/audio/chime.wav', runtimePath: 'assets/audio/chime.wav', mime: 'audio/wav', durationSeconds: 1.2 },
  { id: 'audio:sound:step', name: '가벼운 발걸음', kind: 'sound', src: '/assets/audio/step.wav', runtimePath: 'assets/audio/step.wav', mime: 'audio/wav', durationSeconds: .5 },
...(storyScore as AudioAsset[]),
].map(asset => Object.freeze(asset as AudioAsset)));
export function resolveAudioAsset(id: string): AudioAsset | undefined { return AUDIO_CATALOG.find(asset => asset.id === id); }
export function searchAudioAssets(assets: readonly AudioAsset[], kind: AudioAsset['kind'], query: string): AudioAsset[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return assets.filter(asset => (asset.kind === kind || Boolean(customAudioRuntimePath(asset.id))) && terms.every(term => `${asset.name} ${asset.id}`.toLocaleLowerCase().includes(term)));
}
/** Custom IDs encode a content digest and safe extension for synchronous scene compilation. */
export function customAudioRuntimePath(id: string): string | undefined {
  const match = /^audio:custom:([a-f0-9]{64}):(wav|mp3|ogg)$/.exec(id);
  return match ? `assets/audio/${match[1]}.${match[2]}` : undefined;
}
