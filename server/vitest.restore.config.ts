import {defineConfig} from 'vitest/config';
import base from './vitest.config.ts';
/** Replace include instead of merging arrays: never seed unrelated tests into a restore. */
export default defineConfig({...base,test:{...base.test,include:['operations/restore-content.integration.ts'],coverage:{enabled:false}}});
