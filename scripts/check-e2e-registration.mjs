// Every E2E spec must run in some Playwright project, or be listed here with the reason it runs only by hand.
// Unregistered specs silently stop running and drift from the product (found 2026-11-10).
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const manualOnly = {
  'catalog-weather-continuity.spec.ts': 'Ren’Py native catalogue path check; needs a prepared runtime build',
  'mobile-reader-capacity.spec.ts': 'historical 2026-10-18 reader capacity evidence; needs a prepared runtime build',
  'reader-reform.spec.ts': 'historical 2026-10-18 reader reform evidence; needs a prepared runtime build',
  'restored-release.spec.ts': 'runs only against a restored deployment (KNOLSTORY_RESTORE_MANIFEST_SHA)',
};
const configs = ['playwright.config.ts',
  ...readdirSync(join(root, 'tests')).filter(name => name.endsWith('.playwright.config.ts')).map(name => join('tests', name)),
  'packages/compatibility/tests/office-browser.playwright.config.ts'];
const registered = configs.map(path => readFileSync(join(root, path), 'utf8')).join('\n');
const specs = readdirSync(join(root, 'tests/e2e')).filter(name => name.endsWith('.spec.ts'));
const missing = specs.filter(name => !registered.includes(`'${name}'`) && !(name in manualOnly));
const stale = Object.keys(manualOnly).filter(name => !specs.includes(name) || registered.includes(`'${name}'`));
if (missing.length || stale.length) {
  if (missing.length) console.error(`E2E specs not in any Playwright project:\n  ${missing.join('\n  ')}\nAdd each to a project testMatch, or to manualOnly with a reason.`);
  if (stale.length) console.error(`manualOnly entries that are missing or already registered:\n  ${stale.join('\n  ')}`);
  process.exit(1);
}
console.log(`E2E registration: ${specs.length} specs, ${specs.length - Object.keys(manualOnly).length} in Playwright projects, ${Object.keys(manualOnly).length} manual-only.`);
