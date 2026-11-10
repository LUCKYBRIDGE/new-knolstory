'use client';
import {useMemo} from 'react';
import qrcode from 'qrcode-generator';
import styles from './classroom.module.css';
/** Renders the QR as plain SVG paths, so no HTML string is injected. */
export function QrCode({value,label}:{value:string;label:string}){
 const geometry=useMemo(()=>{
  const qr=qrcode(0,'M');qr.addData(value);qr.make();
  const count=qr.getModuleCount(),margin=2;let path='';
  for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.isDark(row,col))path+=`M${col+margin} ${row+margin}h1v1h-1z`;
  return {size:count+margin*2,path};
 },[value]);
 return <svg className={styles.qr} role="img" aria-label={label} viewBox={`0 0 ${geometry.size} ${geometry.size}`} shapeRendering="crispEdges"><rect width={geometry.size} height={geometry.size} fill="#fff"/><path d={geometry.path} fill="#000"/></svg>;
}
