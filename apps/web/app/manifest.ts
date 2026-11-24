import type {MetadataRoute} from 'next';

export const dynamic='force-static';

/** Home screen app (2026-11-23): opens without the address bar or the fullscreen exit notice. */
export default function manifest():MetadataRoute.Manifest{
 return {
  id:'/',
  name:'놀스토리',
  short_name:'놀스토리',
  description:'이야기를 읽고 직접 만드는 놀스토리',
  lang:'ko',
  start_url:'/',
  scope:'/',
  display:'fullscreen',
  display_override:['fullscreen','standalone'],
  background_color:'#fbf5e9',
  theme_color:'#fbf5e9',
  icons:[
   {src:'/app-icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'/app-icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
   {src:'/app-icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
  ],
 };
}
