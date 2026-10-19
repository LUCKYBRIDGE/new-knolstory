import type {AudioCategory} from '@knolstory/asset-registry';
export type AudioMetadataDraft=Readonly<{name:string;category:AudioCategory;tags:string;originalName:string;source:string}>;
export type AudioMetadataDraftState=Readonly<{baseline:AudioMetadataDraft;draft:AudioMetadataDraft}>;
/** Refresh shared values only where the author has not changed the previous value. */
export function reconcileAudioMetadataDraft(state:AudioMetadataDraftState,next:AudioMetadataDraft):AudioMetadataDraftState{
 return {baseline:next,draft:{
  name:state.draft.name===state.baseline.name?next.name:state.draft.name,
  category:state.draft.category===state.baseline.category?next.category:state.draft.category,
  tags:state.draft.tags===state.baseline.tags?next.tags:state.draft.tags,
  originalName:state.draft.originalName===state.baseline.originalName?next.originalName:state.draft.originalName,
  source:state.draft.source===state.baseline.source?next.source:state.draft.source,
 }};
}
/** A successful save cleans submitted fields, but never edits typed while awaiting storage. */
export function acknowledgeAudioMetadataSave(state:AudioMetadataDraftState,submitted:AudioMetadataDraft,canonical:AudioMetadataDraft):AudioMetadataDraftState{
 return reconcileAudioMetadataDraft({baseline:submitted,draft:state.draft},canonical);
}
