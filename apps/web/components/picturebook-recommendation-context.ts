'use client';
import {createContext,useContext} from 'react';
import {NO_RECOMMENDATIONS,type PicturebookRecommendations} from '../lib/picturebook-recommendations';

/** The current chapter's ‘숏스토리 추천’, for every image picker inside the editor. Empty elsewhere. */
export const PicturebookRecommendationContext=createContext<PicturebookRecommendations>(NO_RECOMMENDATIONS);
export const usePicturebookRecommendations=()=>useContext(PicturebookRecommendationContext);
