import {it,expect} from 'vitest';
import {actorMotionChoice} from './actor-motion-choice';
it('changes only kind while preserving authored times and optional path',()=>{
 const motion={type:'move' as const,durationMs:2300,delayMs:1100,fromXAnchor:20};expect(actorMotionChoice(motion,'fade-out')).toEqual({...motion,type:'fade-out'});expect(actorMotionChoice(motion,'move')).toEqual(motion);expect(motion.type).toBe('move');
 expect(actorMotionChoice({type:'fade-in'},'fade-out')).toEqual({type:'fade-out'});
});
it('uses defaults only for a new motion and explicit none removes it',()=>{expect(actorMotionChoice(undefined,'move')).toEqual({type:'move',durationMs:600,delayMs:0});expect(actorMotionChoice({type:'fade-in',delayMs:1200},'')).toBeUndefined();});
