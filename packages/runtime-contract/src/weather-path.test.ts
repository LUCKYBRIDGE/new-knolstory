import {it,expect} from 'vitest';
import {isRuntimeImagePath} from './index';
it('allows only the reviewed generated rainy-courtyard path',()=>{
 expect(isRuntimeImagePath('assets/backgrounds/weather-v1/seonnyeo-cottage-rain-evening.webp')).toBe(true);
 for(const path of ['assets/backgrounds/weather-v1/unreviewed.webp','assets/backgrounds/weather-v1/../secret.webp','https://example.com/background.webp'])expect(isRuntimeImagePath(path)).toBe(false);
});
