import {notFound} from 'next/navigation';
import {FocusCatalogGallery} from '../../components/a2ui/focus-catalog-gallery';

// Development view of the A2UI focus editor catalog. Not part of the service.
export default function A2uiCatalogPage(){
 if(process.env.NODE_ENV==='production')notFound();
 return <FocusCatalogGallery/>;
}
