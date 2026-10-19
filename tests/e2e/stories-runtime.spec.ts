import {previousReadCut} from './reader-actions';
import {enterLibrary, openBuiltinEdition} from './library-entry';
import {advanceReading, editReadCut, openEditorDetails, readerTools} from './native-reader';
import {parseAuthoringFile} from './authoring-file';
import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";

const fixtures = ["seonnyeo", "heungbu", "onggojib", "rabbit"].map((id) => ({
  id,
  project: JSON.parse(
    readFileSync(`tests/fixtures/stories/${id}.json`, "utf8"),
  ),
}));
async function rendered(page: Page) {
  const status = page.getByTestId("story-runtime-status");
  await expect(status).toContainText("연결됨", { timeout: 90000 });
  await expect
    .poll(
      async () =>
        status.evaluate(
          (node) =>
            Number(node.getAttribute("data-rendered-revision")) >= 0 &&
            node.getAttribute("data-rendered-revision") ===
            node.getAttribute("data-scene-revision"),
        ),
      { timeout: 30000 },
    )
    .toBe(true);
}
async function openFixture(page: Page, id: string) {
  if (await page.getByLabel('대사 / 해설', {exact: true}).isVisible())
    await page.getByRole('button', {name: '서재로', exact: true}).click();
  await enterLibrary(page);
  await openBuiltinEdition(page, id, 'knolstory', 'edit');
  await rendered(page);
}
async function tool(page: Page, name: string) {
  const tools = page.locator('[data-additional-tools]');
  if (name !== '배경·인물 편집' && !await tools.evaluate(node => (node as HTMLDetailsElement).open))
    await tools.locator(':scope>summary').click();
  await page.getByRole('button', {name, exact: true}).click();
}
async function currentReadCut(page: Page, id: string) {
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback?.lineId)).toBe(id);
  await rendered(page);
}
async function chooseCut(
  page: Page,
  project: (typeof fixtures)[number]['project'],
  lineId: string,
) {
  expect(project.lines.some((item: {id: string}) => item.id === lineId)).toBe(true);
  await page.getByLabel('현재 장과 컷 이동', {exact: true}).selectOption(lineId);
  await expect(page.getByLabel('현재 장과 컷 이동', {exact: true})).toHaveValue(lineId);
  await rendered(page);
}
async function exportProject(page: Page) {
  const menu = page.locator('[data-work-menu]');
  if (!await menu.evaluate(node => (node as HTMLDetailsElement).open)) await menu.locator(':scope>summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', {name: '작품 파일 내보내기', exact: true}).click();
  const download = await pending;
  const document = parseAuthoringFile(readFileSync((await download.path())!, 'utf8'));
  if (await menu.evaluate(node => (node as HTMLDetailsElement).open)) await menu.locator(':scope>summary').click();
  return document;
}

async function startCut(page: Page) {
  await page.getByRole('button', {name: '이 컷부터 재생', exact: true}).click();
  await rendered(page);
  const status = page.getByTestId('story-runtime-status');
  if (await status.getAttribute('data-audio-unlocked') !== 'true') {
    const frame = page.getByTestId('story-runtime-frame');
    await frame.scrollIntoViewIfNeeded();
    const bounds = (await frame.boundingBox())!;
    // The first native gesture dismisses the runtime unlock overlay.
    // Keep it outside choice and transition actions, then click those separately.
    await page.mouse.click(bounds.x + bounds.width * .5, bounds.y + bounds.height * .1);
  }
  await expect(status).toHaveAttribute('data-audio-unlocked', 'true');
}


test("all four full manuscripts render actual image assets and edited text in one persistent Ren’Py instance", async ({
  page,
}) => {
  await page.goto("/");
  const frame = page.getByTestId("story-runtime-frame");
  let persistentFrame: Awaited<ReturnType<typeof frame.elementHandle>> | undefined;
  for (const fixture of fixtures) {
    await openFixture(page, fixture.id);
    if (!persistentFrame) {
      persistentFrame = await frame.elementHandle();
      await frame.evaluate(node => node.setAttribute("data-instance", "persistent"));
    }
    expect(await persistentFrame!.evaluate(node => node === document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);
    await expect(frame).toHaveAttribute("data-instance", "persistent");
    const original = await page.getByLabel("대사 / 해설").inputValue();
    await page
      .getByLabel("대사 / 해설")
      .fill(`${original}\n실제 렌파이에 반영한 문장입니다.`);
    await rendered(page);
    // The upper stage has no Web story renderer; varied pixels here come from Ren’Py imagery.
    await expect
      .poll(
        async () => {
          const png = PNG.sync.read(
            await page.getByTestId("story-stage-viewport").screenshot(),
          );
          const colors = new Set<number>();
          for (
            let y = Math.floor(png.height * 0.15);
            y < Math.floor(png.height * 0.5);
            y += 3
          )
            for (
              let x = Math.floor(png.width * 0.2);
              x < Math.floor(png.width * 0.8);
              x += 3
            ) {
              const n = (y * png.width + x) * 4;
              colors.add(
                (png.data[n]! << 16) +
                  (png.data[n + 1]! << 8) +
                  png.data[n + 2]!,
              );
            }
          return colors.size;
        },
        { timeout: 30000 },
      )
      .toBeGreaterThan(150);
    await page.screenshot({
      path: `${process.env.KNOL_NATIVE_EVIDENCE_DIR??'test-results/native-current'}/stories-runtime/story-${fixture.id}-actual.png`,
      fullPage: true,
    });
    const lines: {
      id: string;
      flow?: { type: string };
      presentation?: unknown;
    }[] = fixture.project.lines;
    const targets = [
      ...new Set<string>([
        lines[0]!.id,
        lines.at(-1)!.id,
        ...lines
          .filter((line) => line.flow?.type === "choice")
          .slice(0, 2)
          .map((line) => line.id),
        ...lines
          .filter((line) => line.flow?.type === "goto")
          .slice(0, 2)
          .map((line) => line.id),
        ...lines
          .filter((line) => line.presentation)
          .slice(0, 4)
          .map((line) => line.id),
        ...[0.1, 0.3, 0.5, 0.7, 0.9].map(
          (fraction) => lines[Math.floor(lines.length * fraction)]!.id,
        ),
      ]),
    ].slice(0, 12);
    for (const id of targets) {
      await chooseCut(page, fixture.project, id);
      await expect(page.getByTestId("workspace-error")).toHaveCount(0);
    }
  }
});

test("representative native choices move to their linked cut and back restores choice", async ({
  page,
}) => {
  await page.goto("/");
  for (const fixture of fixtures) {
    await openFixture(page, fixture.id);
    const choice = fixture.project.lines.find(
      (line: {
        flow?: { type: string; options: { targetLineId: string | null }[] };
      }) =>
        line.flow?.type === "choice" &&
        line.flow.options.some((option) => option.targetLineId),
    );
    expect(choice).toBeTruthy();
    await chooseCut(page, fixture.project, choice.id);
    await startCut(page);
    await rendered(page);
    const option = choice.flow.options[0];
    expect(option.targetLineId).toBeTruthy();
    // Click the real Ren’Py choice, not a Web renderer or semantic fallback.
    const frame = page.getByTestId('story-runtime-frame');
    await frame.scrollIntoViewIfNeeded();
    const bounds = (await frame.boundingBox())!;
    const status = page.getByTestId('story-runtime-status');
    const rect = JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};
    expect(rect).not.toBeNull();
    const width = Number(await status.getAttribute('data-scene-width'));
    const height = Number(await status.getAttribute('data-scene-height'));
    const scale = Math.min(bounds.width / width, bounds.height / height);
    await page.mouse.click(
      bounds.x + (bounds.width - width * scale) / 2 + (rect.x + rect.width / 2) * scale,
      bounds.y + (bounds.height - height * scale) / 2 + (rect.y + Math.min(20, Math.floor(rect.height / 8)) + 25) * scale,
    );
    await currentReadCut(page, option.targetLineId);
    await previousReadCut(page);
    await rendered(page);
    await currentReadCut(page, choice.id);
    await expect(page.getByTestId("playback-status")).toHaveText(
      "선택해 주세요",
    );
    await editReadCut(page);
  }
});

test('Onggojib confirmation transition blocks host advance until native confirmation', async ({ page }) => {
  await page.goto('/');
  const fixture = fixtures.find(f => f.id === 'onggojib')!;
  await openFixture(page, 'onggojib');
  const cut = fixture.project.lines.find((line: {presentation?: {transition?: {mode?:string}}}) => line.presentation?.transition?.mode === 'confirm');
  expect(cut).toBeTruthy();
  await chooseCut(page, fixture.project, cut.id);
  await startCut(page);
  await rendered(page);
  await expect(page.getByRole('button', { name: '다음으로', exact: true })).toBeDisabled();
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('전환 화면');
  const frame = page.getByTestId('story-runtime-frame');
  await frame.scrollIntoViewIfNeeded();
  const bounds = (await frame.boundingBox())!;
  const width = Number(await status.getAttribute('data-scene-width'));
  const height = Number(await status.getAttribute('data-scene-height'));
  const scale = Math.min(bounds.width / width, bounds.height / height);
  // The current native transition action is pinned 56 logical pixels above the bottom.
  await page.mouse.click(
    bounds.x + (bounds.width - width * scale) / 2 + width * .5 * scale,
    bounds.y + (bounds.height - height * scale) / 2 + (height - 56) * scale,
  );
  await expect(status).not.toContainText('전환 화면');
  await expect(page.getByRole('button', { name: '다음으로', exact: true })).toBeEnabled();
  await currentReadCut(page, cut.id);
  await page.getByRole('button', {name:'읽기 메뉴',exact:true}).click();
  await page.getByRole('button', {name:'읽기 설정',exact:true}).click();
  await page.getByRole('button', {name:'동작 줄이기 · 꺼짐',exact:true}).click();
  await page.getByRole('button', {name:'읽기 메뉴 닫기',exact:true}).click();
  await rendered(page);
  await expect(page.getByRole('button',{name:'다음으로',exact:true})).toBeEnabled();
  // Responsive refitting preserves the native confirmation acknowledgement.
  await page.setViewportSize({width:390,height:844});
  await rendered(page);
  await readerTools(page);
  await expect(page.getByRole('button',{name:'다음으로',exact:true})).toBeEnabled();
  await advanceReading(page);
  await rendered(page);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback?.lineId)).not.toBe(cut.id);
});

test('actual image placement and presentation edits survive document export and native playback', async ({ page }) => {
  await page.goto('/');
  await openFixture(page, 'seonnyeo');
  await rendered(page);
  const baseline = await exportProject(page);
  const source = baseline.project;
  const line = source.lines[0];
  expect(source.lines.map((cut: {id:string}) => cut.id)).toEqual(fixtures[0].project.lines.map((cut: {id:string}) => cut.id));
  await tool(page, '배경·인물 편집');
  await openEditorDetails(page, '추가 인물·세부 배치');
  await page.getByLabel('왼쪽 1번 인물 가로 위치', { exact: true }).fill('35');
  await page.getByLabel('왼쪽 1번 인물 크기 배율', { exact: true }).fill('1.1');
  await tool(page, '연출 편집');
  await page.getByLabel('조정할 연출', {exact: true}).selectOption('look');
  await page.getByLabel('분위기', { exact: true }).selectOption('flashback');
  await page.getByLabel('조정할 연출', {exact: true}).selectOption('effects');
  await page.getByLabel('효과', { exact: true }).selectOption('shake');
  await rendered(page);
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
  const document = await exportProject(page);
  const changed = document.project.lines.find((cut: {id:string}) => cut.id === line.id);
  expect(changed.stageComposition.leftActors[0].xAnchor).toBe(35);
  expect(changed.stageComposition.leftActors[0].scaleMultiplier).toBe(1.1);
  expect(changed.stageComposition.rightActors).toEqual(line.stageComposition.rightActors);
  expect(changed.flow).toEqual(line.flow);
  expect(changed.presentation.look.type).toBe('flashback');
  expect(changed.presentation.effects[0].type).toBe('shake');
  expect(document.project.planning).toEqual(source.planning);
  expect(document.project).toEqual({...source, updatedAt: document.project.updatedAt,
    lines: source.lines.map((cut: {id:string}) => cut.id === line.id ? {
      ...line,
      inheritActors: false,
      stageComposition: {...line.stageComposition, leftActors: line.stageComposition.leftActors.map((actor: object, index: number) => index === 0 ? {...actor, xAnchor: 35, scaleMultiplier: 1.1} : actor)},
      presentation: {...line.presentation, look: {...line.presentation?.look, type: 'flashback', intensity: line.presentation?.look?.intensity ?? 'normal'}, effects: [{type: 'shake', intensity: 'normal'}]},
    } : cut),
  });
  expect(document.audioResources).toEqual(baseline.audioResources);
  await startCut(page);
  await rendered(page);
  await page.screenshot({ path: `${process.env.KNOL_NATIVE_EVIDENCE_DIR??'test-results/native-current'}/stories-runtime/story-placement-edited.png`, fullPage: true });
});
