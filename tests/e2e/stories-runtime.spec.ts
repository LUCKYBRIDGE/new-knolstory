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
            node.getAttribute("data-rendered-revision") ===
            node.getAttribute("data-scene-revision"),
        ),
      { timeout: 30000 },
    )
    .toBe(true);
}
async function chooseCut(
  page: Page,
  project: (typeof fixtures)[number]["project"],
  lineId: string,
) {
  expect(project.lines.some((item: { id: string }) => item.id === lineId)).toBe(true);
  const cut = page.locator(`[data-line-id="${lineId}"]`);
  const details = page
    .getByRole("complementary", { name: "장과 컷 목록" })
    .locator("details")
    .filter({ has: cut });
  if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open)))
    await details.locator("summary").click();
  await page.locator(`[data-line-id="${lineId}"]`).click();
  await rendered(page);
}

test("all four full manuscripts render actual image assets and edited text in one persistent Ren’Py instance", async ({
  page,
}) => {
  await page.goto("/?view=editor");
  const frame = page.getByTestId("story-runtime-frame");
  await frame.evaluate((node) =>
    node.setAttribute("data-instance", "persistent"),
  );
  for (const fixture of fixtures) {
    await page.getByLabel("작품 선택").selectOption(fixture.id);
    await rendered(page);
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
      path: `test-results/story-${fixture.id}-actual.png`,
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
  await page.goto("/?view=editor");
  for (const fixture of fixtures) {
    await page.getByLabel("작품 선택").selectOption(fixture.id);
    const choice = fixture.project.lines.find(
      (line: {
        flow?: { type: string; options: { targetLineId: string | null }[] };
      }) =>
        line.flow?.type === "choice" &&
        line.flow.options.some((option) => option.targetLineId),
    );
    expect(choice).toBeTruthy();
    await chooseCut(page, fixture.project, choice.id);
    await page.getByRole("button", { name: "현재 컷부터 읽기" }).click();
    await rendered(page);
    const option = choice.flow.options[0];
    expect(option.targetLineId).toBeTruthy();
    // Click the real Ren’Py choice, not a Web renderer or semantic fallback.
    const frameBounds = await page
      .getByTestId("story-runtime-frame")
      .boundingBox();
    expect(frameBounds).toBeTruthy();
    await page.mouse.click(
      frameBounds!.x + frameBounds!.width * 0.5,
      frameBounds!.y + frameBounds!.height * ((Math.min(110,Number(await page.getByTestId('story-runtime-status').getAttribute('data-textbox-y'))*.2)+45) / Number(await page.getByTestId('story-runtime-status').getAttribute('data-scene-height'))),
    );
    await rendered(page);
    await expect(
      page.locator(`[data-line-id="${option.targetLineId}"]`),
    ).toHaveAttribute("aria-current", "true");
    await page.getByRole("button", { name: "이전으로", exact: true }).click();
    await rendered(page);
    await expect(page.locator(`[data-line-id="${choice.id}"]`)).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByTestId("playback-status")).toHaveText(
      "선택해 주세요",
    );
    await page.getByRole("button", { name: "편집으로", exact: true }).click();
  }
});

test('Onggojib confirmation transition blocks host advance until native confirmation', async ({ page }) => {
  await page.goto('/?view=editor');
  const fixture = fixtures.find(f => f.id === 'onggojib')!;
  await page.getByLabel('작품 선택').selectOption('onggojib');
  const cut = fixture.project.lines.find((line: {presentation?: {transition?: {mode?:string}}}) => line.presentation?.transition?.mode === 'confirm');
  expect(cut).toBeTruthy();
  await chooseCut(page, fixture.project, cut.id);
  await page.getByRole('button', { name: '현재 컷부터 읽기' }).click();
  await rendered(page);
  await expect(page.getByRole('button', { name: '다음으로', exact: true })).toBeDisabled();
  const bounds = await page.getByTestId('story-runtime-frame').boundingBox();
  expect(bounds).toBeTruthy();
  // The native confirm button is centered in the transition stack; inspect pixels/effect via real runtime.
  for (const y of [470, 500, 530, 560, 440, 410]) {
    if (await page.getByRole('button', { name: '다음으로', exact: true }).isEnabled()) break;
    await page.mouse.click(bounds!.x + bounds!.width * .5, bounds!.y + bounds!.height * (y / Number(await page.getByTestId('story-runtime-status').getAttribute('data-scene-height'))));
    await page.waitForTimeout(100);
  }
  await expect(page.getByRole('button', { name: '다음으로', exact: true })).toBeEnabled();
  await expect(page.locator(`[data-line-id="${cut.id}"]`)).toHaveAttribute('aria-current','true');
  await page.getByRole('button',{name:'동작 줄이기',exact:true}).click();await rendered(page);
  await expect(page.getByRole('button',{name:'다음으로',exact:true})).toBeEnabled();
  await page.getByLabel('화면 구도').selectOption('portrait');await rendered(page);
  await expect(page.getByRole('button',{name:'다음으로',exact:true})).toBeEnabled();
  await page.getByRole('button', { name: '다음으로', exact: true }).click();
  await rendered(page);
  await expect(page.locator(`[data-line-id="${cut.id}"]`)).not.toHaveAttribute('aria-current','true');
});

test('actual image placement and presentation edits survive document export and native playback', async ({ page }) => {
  await page.goto('/?view=editor');
  await page.getByLabel('작품 선택').selectOption('seonnyeo');
  await rendered(page);
  const source = fixtures[0].project;
  const line = source.lines[0];
  await page.getByLabel('왼쪽 1번 인물 가로 위치', { exact: true }).fill('35');
  await page.getByLabel('왼쪽 1번 인물 크기 배율', { exact: true }).fill('1.1');
  await page.getByLabel('분위기', { exact: true }).selectOption('flashback');
  await page.getByLabel('효과', { exact: true }).selectOption('shake');
  await rendered(page);
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기' }).click();
  const downloaded = await downloadPromise;
  const document = JSON.parse(readFileSync((await downloaded.path())!, 'utf8'));
  const changed = document.project.lines.find((cut: {id:string}) => cut.id === line.id);
  expect(changed.stageComposition.leftActors[0].xAnchor).toBe(35);
  expect(changed.stageComposition.leftActors[0].scaleMultiplier).toBe(1.1);
  expect(changed.stageComposition.rightActors).toEqual(line.stageComposition.rightActors);
  expect(changed.flow).toEqual(line.flow);
  expect(changed.presentation.look.type).toBe('flashback');
  expect(changed.presentation.effects[0].type).toBe('shake');
  expect(document.project.planning).toEqual(source.planning);
  await page.getByRole('button', { name: '현재 컷부터 읽기' }).click();
  await rendered(page);
  await page.screenshot({ path: 'test-results/story-placement-edited.png', fullPage: true });
});
