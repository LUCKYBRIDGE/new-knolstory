import {it,expect} from 'vitest';
import {serviceLinks,teacherPanelFromSearch} from './service-navigation';
it('keeps the library shared and gives each classroom role its own tasks',()=>{
 expect(serviceLinks('guest').map(link=>link.label)).toEqual(['서재']);
 expect(serviceLinks('member').map(link=>link.label)).toEqual(['서재']);
 expect(serviceLinks('teacher').map(link=>link.label)).toEqual(['서재','과제','학생']);
 expect(serviceLinks('admin').map(link=>link.label)).toEqual(['서재','과제','학생','관리']);
 expect(serviceLinks('admin')[3].href).toBe('/admin');
 expect(serviceLinks('student').map(link=>link.label)).toEqual(['서재','내 과제']);
 expect(serviceLinks('student')[1].href).toBe('/student');
});
it('keeps teacher settings separate and validates panel URLs',()=>{
 expect(teacherPanelFromSearch('')).toBe('assignments');
 expect(teacherPanelFromSearch('?tab=students')).toBe('students');
 expect(teacherPanelFromSearch('?tab=settings')).toBe('settings');
 expect(teacherPanelFromSearch('?tab=anything')).toBe('assignments');
});
