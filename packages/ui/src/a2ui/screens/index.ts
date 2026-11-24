// Blueprints of the six focus editing screens as A2UI v0.9 messages.
// They describe the current screens' skeleton and tools; edit them together with the screen code.
import audio from './audio.json' with {type:'json'};
import background from './background.json' with {type:'json'};
import basic from './basic.json' with {type:'json'};
import characters from './characters.json' with {type:'json'};
import direction from './direction.json' with {type:'json'};
import text from './text.json' with {type:'json'};
import type {A2uiMessage} from '../surface';

export const focusScreenBlueprints={basic,text,background,characters,audio,direction} as unknown as Record<'basic'|'text'|'background'|'characters'|'audio'|'direction',A2uiMessage[]>;
