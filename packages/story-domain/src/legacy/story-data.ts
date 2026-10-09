import type { StorySource } from "./story-source";
import type { StoryCover } from "./story-cover";
export type { StoryCover } from "./story-cover";
import type { StoryPresentation } from "./story-presentation";
export type { StorySceneEffect } from "./story-scene-effect";
import type { CreativeMemo } from "./creative-memos";
import {
  canonicalizeStoryStageKeys,
  type StoryStageKey,
} from "./story-stages";

export type { StoryStageKey };

export type Chapter = {
  /** Narrative chapter identity; order remains the stable list/flow ordering. */
  chapterNumber?: number;
  branchLabel?: string;
  audio?: import("./story-audio").StoryAudio;
  id: string;
  order: number;
  title: string;
  summary: string;
  purpose: string;
  mood: string;
  keyEvents: string;
  nextChapterIdea: string;
  storyStageKeys: StoryStageKey[];
  chapterSpeakerNames: string[];
  characterAssetIds: string[];
  backgroundAssetIds: string[];
  backgroundId: string;
  leftAssetId: string;
  rightAssetId: string;
};

export type StoryLine = {
  audio?: import("./story-audio").StoryAudio;
  inheritActors?: boolean;
  workingTitle?: string;
  ending?: { name: string; description: string; endsStory: boolean };
  stageComposition?: import("./story-stage-composition").StageComposition;
  flow?: import("./story-flow").StoryFlow;
  presentation?: StoryPresentation;
  id: string;
  chapterId: string;
  order: number;
  type: "dialogue" | "narration";
  speaker: "left" | "right" | "narration";
  speakerName: string;
  coSpeakerNames?: string[];
  text: string;
  leftAssetId: string;
  rightAssetId: string;
  backgroundId: string;
  /** Explicitly hide the background; omission preserves chapter/project inheritance. */
  backgroundMode?: "none";
  purposeNote: string;
  emotionNote: string;
  directionNote: string;
};

export type StoryPlanning = {
  premise: string;
  structureMode: "free" | "five" | "four" | "three";
  material: string;
  theme: string;
  mainCharacter: string;
  mainGoal: string;
  centralProblem: string;
  stakes: string;
  endingChange: string;
  opening: string;
  middle: string;
  crisis: string;
  climax: string;
  ending: string;
  characterNotes: string;
  worldNotes: string;
  mood: string;
  openQuestions: string;
  freeNotes: string;
};

export type StoryCharacter = { id: string; name: string; role: string; description: string; defaultImageId: string };

export type StoryProject = {
  choiceMode?: "simple" | "choice" | "free";
  stageDefaults?: Pick<Chapter, "backgroundId" | "leftAssetId" | "rightAssetId">;
  characters?: StoryCharacter[];
  source?: StorySource;
  cover?: StoryCover;
  id: string;
  title: string;
  description: string;
  continuation?: {
    chapterId: string;
    lineId: string;
    label: string;
  };
  planning: StoryPlanning;
  creativeMemos: CreativeMemo[];
  sheetUrl: string;
  sheetEditable: boolean;
  speakerNames: string[];
  chapters: Chapter[];
  lines: StoryLine[];
  updatedAt: string;
};
