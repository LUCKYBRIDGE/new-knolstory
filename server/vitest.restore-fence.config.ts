import {defineConfig} from 'vitest/config';
import base from './vitest.config.ts';
export default defineConfig({...base,test:{...base.test,include:['operations/restore-fence.integration.ts'],coverage:{enabled:false}}});
