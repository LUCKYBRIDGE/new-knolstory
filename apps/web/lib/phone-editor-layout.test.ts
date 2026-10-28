import {it,expect} from 'vitest';
import {usesPhoneEditor} from './phone-editor-layout';
it('adapts narrow windows and both phone orientations without shrinking a tablet for its keyboard',()=>{
 expect(usesPhoneEditor(412,412,915,true)).toBe(true);
 expect(usesPhoneEditor(915,412,915,true)).toBe(true);
 expect(usesPhoneEditor(680,1920,1080,false)).toBe(true);
 expect(usesPhoneEditor(800,800,1280,true)).toBe(false);
 expect(usesPhoneEditor(1280,800,1280,true)).toBe(false);
 expect(usesPhoneEditor(915,1920,1080,false)).toBe(false);
});
