'use client';
import {useEffect,useState} from 'react';
import {usesPhoneEditor} from '../lib/phone-editor-layout';
export function usePhoneEditor(){
 const [phone,setPhone]=useState(false);
 useEffect(()=>{
  const coarse=matchMedia('(pointer: coarse)');
  const sync=()=>setPhone(usesPhoneEditor(innerWidth,screen.width,screen.height,coarse.matches));
  sync();window.addEventListener('resize',sync);window.addEventListener('orientationchange',sync);coarse.addEventListener('change',sync);
  return()=>{window.removeEventListener('resize',sync);window.removeEventListener('orientationchange',sync);coarse.removeEventListener('change',sync);};
 },[]);
 return phone;
}
