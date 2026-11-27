import {describe, expect, it} from 'vitest';
import {
  bakssiClassicStory,
  bakssiKnolStory,
  getBakssiClassicStory,
  getBakssiKnolStory,
} from '../../compatibility/src/bakssi-stories';
import {resolveAsset} from '@knolstory/asset-registry';
import recipe from '../../../assets/source/bakssi/recipe.json';
import {findStoryFlowIssues, serializeStoryDocument, type StoryProject} from '@knolstory/story-domain';
import {advancePlayback, compileStoryScene, createPlayback, restorePlayback, type PlaybackState} from '../src/story-runtime';

function readRoutes(project: StoryProject) {
  const routes: PlaybackState[] = [];
  const byId = new Map(project.lines.map(line => [line.id, line]));
  const pending = [createPlayback(project)];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current.status === 'ended') {
      routes.push(current);
      continue;
    }
    expect(current.status).toMatch(/^(reading|choice)$/u);
    expect(new Set(current.path).size).toBe(current.path.length);
    const line = byId.get(current.lineId!);
    if (!line) throw new Error(`Missing cut ${current.lineId}`);
    const choices = line.flow?.type === 'choice' ? line.flow.options.map(option => option.id) : [undefined];
    for (const choiceId of choices) pending.push(advancePlayback(project, current, choiceId));
  }
  return routes;
}

const editions = [bakssiClassicStory, bakssiKnolStory];
const stageImageIds = new Set(editions.flatMap(project => [
  project.cover?.backgroundId ?? '',
  project.cover?.characterId ?? '',
  ...project.characters?.map(character => character.defaultImageId) ?? [],
  ...project.lines.flatMap(line => [
    line.backgroundId,
    ...[...line.stageComposition!.leftActors, ...line.stageComposition!.rightActors]
      .map(actor => actor.assetId),
  ]),
]));
const missingStageImages = [...stageImageIds].filter(id => !resolveAsset(id));
const requireArt = process.env.KNOL_BAKSSI_REQUIRE_ART === '1';

describe('박씨전 제공 원고', () => {
  it('opens the 91-cut original edition in authored order', () => {
    expect(bakssiClassicStory.id).toBe('classic-bakssi-tale');
    expect(bakssiClassicStory.chapters.map(chapter => chapter.chapterNumber)).toEqual([1,2,3,4,5,6,7,8]);
    expect(findStoryFlowIssues(bakssiClassicStory)).toEqual([]);
    const [route, ...otherRoutes] = readRoutes(bakssiClassicStory);
    expect(otherRoutes).toEqual([]);
    expect(route.path).toEqual(bakssiClassicStory.lines.map(line => line.id));
    expect(route.path).toHaveLength(91);
    expect(restorePlayback(bakssiClassicStory, route)).toEqual(route);
  });

  it('reaches all 415 cuts and four endings through eight native playback paths', () => {
    expect(bakssiKnolStory.id).toBe('bakssi-knolstory');
    expect(bakssiKnolStory.chapters).toHaveLength(21);
    expect(bakssiKnolStory.lines).toHaveLength(415);
    expect(findStoryFlowIssues(bakssiKnolStory)).toEqual([]);
    const routes = readRoutes(bakssiKnolStory);
    expect(routes).toHaveLength(8);
    expect(routes.map(route => route.path.length).sort((a,b) => a-b)).toEqual([210,210,211,211,212,212,217,217]);
    expect(new Set(routes.flatMap(route => route.path))).toEqual(new Set(bakssiKnolStory.lines.map(line => line.id)));
    expect(new Set(routes.map(route => route.path.at(-1)))).toEqual(new Set(['bakssi-x32','bakssi-y33','bakssi-u32','bakssi-v37']));
    const chapters = new Map(bakssiKnolStory.chapters.map(chapter => [chapter.id, chapter]));
    const lines = new Map(bakssiKnolStory.lines.map(line => [line.id, line]));
    for (const route of routes) {
      expect(route.choiceHistory).toHaveLength(3);
      expect(restorePlayback(bakssiKnolStory, route)).toEqual(route);
      const chapterNumbers = route.path.map(id => chapters.get(lines.get(id)!.chapterId)!.chapterNumber);
      expect(chapterNumbers).toEqual([...chapterNumbers].sort((a,b) => a! - b!));
      expect(route.path).toContain('bakssi-d01');
      expect(route.path.includes('bakssi-g01')).not.toBe(route.path.includes('bakssi-h01'));
    }
  });

  it('gives edits independent current document envelopes', () => {
    for (const getEdition of [getBakssiClassicStory, getBakssiKnolStory]) {
      const document = getEdition();
      expect(JSON.parse(serializeStoryDocument(document))).toEqual(document);
      const firstCut = document.project.lines[0];
      firstCut.text = '다른 글';
      expect(getEdition().project.lines[0].text).not.toBe('다른 글');
    }
  });

  it('assigns a planned stage environment and actor asset to the actual manuscript cuts', () => {
    const registeredPlans = new Set(recipe.assets.map(asset => asset.id));
    expect([...stageImageIds].filter(id => !registeredPlans.has(id) && !resolveAsset(id))).toEqual([]);
    const art = (chapter: string) => {
      const stage = bakssiKnolStory.lines.find(line => line.id === `bakssi-${chapter}`)!.stageComposition!;
      return [...stage.leftActors,...stage.rightActors].map(actor => actor.assetId);
    };
    expect(art('c02')).toContain('bakssi-character-bakssi-wedding');
    expect(art('a01')).toContain('bakssi-character-bakssi-revealed');
    expect(art('m16')).toEqual([
      'bakssi-character-gyehwa', 'bakssi-character-sister-young', 'bakssi-character-sister-older',
    ]);
    expect(art('b02')).toContain('bakssi-character-bakssi');
    expect(art('x04')).toContain('bakssi-character-yonguldae');
    expect(art('v12')).toContain('bakssi-character-soli');
  });

  it.skipIf(!requireArt && missingStageImages.length > 0)('compiles every cut with registered artwork in both Ren’Py layouts', () => {
    expect(missingStageImages).toEqual([]);
    for (const project of editions) {
      const byId = new Map(project.lines.map(line => [line.id, line]));
      const compiled = new Set<string>();
      for (const route of readRoutes(project)) {
        route.path.forEach((id, index) => {
          if (compiled.has(id)) return;
          const line = byId.get(id)!;
          const choices = line.flow?.type === 'choice' ? line.flow.options : [];
          const playbackState: PlaybackState = {
            lineId: id,
            path: route.path.slice(0, index + 1),
            status: choices.length ? 'choice' : 'reading',
            choiceHistory: route.choiceHistory?.filter(choice => choice.pathIndex < index),
          };
          for (const viewport of [{width:1280,height:720}, {width:720,height:1280}]) {
            const scene = compileStoryScene(project, id, 1, {mode: 'play', viewport, playbackState});
            expect(scene.background?.imagePath).toBe(resolveAsset(line.backgroundId)?.runtimePath);
            expect(scene.dialogue.text).toBe(line.text);
            expect(scene.choices.map(choice => choice.text)).toEqual(choices.map(choice => choice.label));
            if (viewport.height > viewport.width) expect(scene.actors.length).toBeLessThanOrEqual(1);
          }
          compiled.add(id);
        });
      }
      expect(compiled.size).toBe(project.lines.length);
    }
  });
});
