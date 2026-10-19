'use client';
import {createContext} from 'react';
/** UI-only permission: closing the editor never removes authored branch conditions. */
export const StoryBranchEditingContext=createContext(true);
