import {describe,expect,it} from 'vitest';
import {normalizeShareLink,shareLinkHost} from './share-link';
describe('share link',()=>{
 it('accepts https links and rejects the rest',()=>{
  expect(normalizeShareLink(' https://drive.google.com/drive/folders/abc ')).toBe('https://drive.google.com/drive/folders/abc');
  expect(normalizeShareLink('http://example.com')).toBeNull();expect(normalizeShareLink('javascript:alert(1)')).toBeNull();
  expect(normalizeShareLink('https://user:pw@example.com')).toBeNull();expect(normalizeShareLink('')).toBeNull();
  expect(shareLinkHost('https://www.drive.google.com/x')).toBe('drive.google.com');
 });
});
