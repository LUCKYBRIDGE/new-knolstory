import {directOnggojibGhostExit} from '../src/catalog-ghost-exit';
import type {StoryProject} from '@knolstory/story-domain';
import {connectCatalogLayeredScenes} from '../src/catalog-layered-scenes';
import {connectCatalogWeatherContinuity} from '../src/catalog-weather-continuity';
import {connectCatalogRainyCourtyard} from '../src/catalog-rainy-courtyard';
/** Current visual policy for earlier text/chapter/branch assertions; historical migration inputs stay explicit. */
export const currentCatalogVisuals=(project:StoryProject)=>directOnggojibGhostExit(connectCatalogRainyCourtyard(connectCatalogWeatherContinuity(connectCatalogLayeredScenes(project))));
