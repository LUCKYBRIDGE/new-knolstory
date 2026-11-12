import {it,expect} from 'vitest';
import {qrPrintPages,qrPrintLayout,qrPrintDensity} from './qr-print-layout';
it('paginates complete class cards into square A4 grids without duplicates or mutation',()=>{
 const cards=Array.from({length:30},(_,i)=>({number:i+1}));
 expect(qrPrintPages(cards,3).map(page=>page.length)).toEqual([9,9,9,3]);
 expect(qrPrintPages(cards,2).map(page=>page.length)).toEqual([4,4,4,4,4,4,4,2]);
 expect(qrPrintPages(cards,5).map(page=>page.length)).toEqual([25,5]);
 expect(qrPrintPages(cards,1)).toHaveLength(30);
 expect(qrPrintPages(cards,3).flat()).toEqual(cards);expect(cards).toHaveLength(30);
});
it('handles a selected subset, exact last page and empty inputs',()=>{
 expect(qrPrintPages([2,7,10,15],2)).toEqual([[2,7,10,15]]);
 expect(qrPrintPages([],3)).toEqual([]);
 for(const n of [0,6,1.5,NaN])expect(()=>qrPrintPages([1],n)).toThrow();
});

it('uses A4 portrait rows independently and reserves space for 40-character names',()=>{
 expect(qrPrintPages(Array.from({length:30}),3,4).map(p=>p.length)).toEqual([12,12,6]);
 expect(qrPrintPages(Array.from({length:30}),3,5).map(p=>p.length)).toEqual([15,15]);
 expect(qrPrintLayout(3,4).qrMm).toBeGreaterThanOrEqual(30);
 expect(qrPrintLayout(5,5).qrMm).toBeGreaterThanOrEqual(23);
 expect(()=>qrPrintLayout(3,7)).toThrow();
});
it('keeps compact QR payloads less dense and blocks unreadable tiny modules',()=>{
 const compact='https://example.com/?q='+('a'.repeat(27)),old='https://example.com/?class-login='+('a'.repeat(43));
 expect(qrPrintDensity([compact],24).maxModules).toBeLessThan(qrPrintDensity([old],24).maxModules);
 expect(qrPrintDensity([compact],24).printable).toBe(true);
 expect(qrPrintDensity([compact],10).printable).toBe(false);
});

it('fits 24 complete cards in a four-column six-row A4 sheet',()=>{
 const cards=Array.from({length:30},(_,i)=>i+1),layout=qrPrintLayout(4,6);
 expect(qrPrintPages(cards,4,6)).toEqual([cards.slice(0,24),cards.slice(24)]);
 expect(layout).toMatchObject({columns:4,rows:6,perPage:24,showHint:false});
 expect(layout.qrMm).toBeGreaterThanOrEqual(23);
 expect(layout.fontPt).toBeGreaterThanOrEqual(7);
 const compact='https://classroom.example.invalid/?q='+('A'.repeat(27));
 expect(qrPrintDensity([compact],layout.qrMm).maxModules).toBeLessThanOrEqual(37);
 expect(qrPrintDensity([compact],layout.qrMm).printable).toBe(true);
});
it('keeps the physical module guard for excessively dense six-row sheets',()=>{
 const compact='https://classroom.example.invalid/?q='+('A'.repeat(27));
 expect(qrPrintDensity([compact],qrPrintLayout(5,6).qrMm).printable).toBe(false);
 for(const [columns,rows] of [[0,6],[6,6],[4,0],[4,7],[4,5.5]])expect(()=>qrPrintLayout(columns,rows)).toThrow();
});
