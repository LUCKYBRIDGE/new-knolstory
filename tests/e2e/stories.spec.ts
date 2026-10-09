import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const label of ["선녀와 나무꾼", "흥부와 놀부", "옹고집전", "별주부전"]) {
  test(`${label}: representative text edits survive reload and file roundtrip`, async ({
    page,
  }) => {
    await page.goto("/?view=editor");
    await page.getByLabel("작품 선택").selectOption({ label });
    const editor = page.getByLabel("대사 / 해설");
    await expect(editor).not.toHaveValue("");
    const original = await editor.inputValue();
    const edited = `${original}\n새 놀스토리에서 고친 문장입니다.`;
    await editor.fill(edited);
    await expect(page.getByTestId("save-status")).toHaveText("기기에 저장됨");
    await page.reload();
    await expect(editor).toHaveValue(edited);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "작품 파일 내보내기" }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    await editor.fill("파일을 불러오기 전 임시 변경");
    await page.getByLabel("작품 파일 가져오기").setInputFiles(path!);
    await expect(editor).toHaveValue(edited);
    await expect(page.getByTestId("workspace-error")).toHaveCount(0);
  });
}

test("persistent story runtime and current edit survive narrow screen changes", async ({
  page,
}) => {
  await page.goto("/?view=editor");
  const frame = page.getByTestId("story-runtime-frame");
  await frame.evaluate((element) =>
    element.setAttribute("data-instance", "same"),
  );
  await page
    .getByLabel("대사 / 해설")
    .fill("화면을 바꾸어도 작품을 잃지 않아요.");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("대사 / 해설")).toHaveValue(
    "화면을 바꾸어도 작품을 잃지 않아요.",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(frame).toHaveAttribute("data-instance", "same");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("malformed import preserves current work and explains the error", async ({
  page,
}) => {
  await page.goto("/?view=editor");
  await page.getByLabel("대사 / 해설").fill("보존해야 하는 작품");
  await page
    .getByLabel("작품 파일 가져오기")
    .setInputFiles({
      name: "broken.knolstory",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
  await expect(page.getByTestId("workspace-error")).toBeVisible();
  await expect(page.getByLabel("대사 / 해설")).toHaveValue(
    "보존해야 하는 작품",
  );
});

test("edits stay separate when switching representative works", async ({
  page,
}) => {
  await page.goto("/?view=editor");
  await page.getByLabel("대사 / 해설").fill("선녀 작품의 수정");
  await page.getByLabel("작품 선택").selectOption("heungbu");
  await page.getByLabel("대사 / 해설").fill("흥부 작품의 수정");
  await page.getByLabel("작품 선택").selectOption("seonnyeo");
  await expect(page.getByLabel("대사 / 해설")).toHaveValue("선녀 작품의 수정");
  await page.getByLabel("작품 선택").selectOption("heungbu");
  await expect(page.getByLabel("대사 / 해설")).toHaveValue("흥부 작품의 수정");
});

test("unfinished links and explicit endings remain distinct in playback", async ({
  page,
}) => {
  await page.goto("/?view=editor");
  await page.getByLabel("진행 방식").selectOption("goto");
  await page.getByLabel("도착 컷", { exact: true }).selectOption("");
  await page.getByRole("button", { name: "현재 컷부터 읽기" }).click();
  await page.getByRole("button", { name: "다음으로", exact: true }).click();
  await expect(page.getByTestId("playback-status")).toHaveText("연결 대기");
  await page.getByRole("button", { name: "편집으로", exact: true }).click();
  await page.getByLabel("도착 컷", { exact: true }).selectOption("__ending");
  await page.getByRole("button", { name: "현재 컷부터 읽기" }).click();
  await page.getByRole("button", { name: "다음으로", exact: true }).click();
  await expect(page.getByTestId("playback-status")).toHaveText("이야기 끝");
  await page.getByRole("button", { name: "이전으로", exact: true }).click();
  await expect(page.getByTestId("playback-status")).toHaveText("읽는 중");
});

test("importing a different work preserves edits in the outgoing representative work", async ({
  page,
}) => {
  await page.goto("/?view=editor");
  await page.getByLabel("작품 선택").selectOption("heungbu");
  await page.getByLabel("대사 / 해설").fill("내보낸 흥부 문장");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "작품 파일 내보내기" }).click();
  const path = await (await downloadPromise).path();
  await page.getByLabel("작품 선택").selectOption("seonnyeo");
  await page.getByLabel("대사 / 해설").fill("보존해야 하는 선녀 문장");
  await page.getByLabel("작품 파일 가져오기").setInputFiles(path!);
  await expect(page.getByLabel("대사 / 해설")).toHaveValue("내보낸 흥부 문장");
  await expect(page.getByLabel("작품 선택")).toHaveValue(/import:/);
  await page.getByLabel("작품 선택").selectOption("seonnyeo");
  await expect(page.getByLabel("대사 / 해설")).toHaveValue(
    "보존해야 하는 선녀 문장",
  );
  await page.getByLabel("작품 선택").selectOption("heungbu");
  await expect(page.getByLabel("대사 / 해설")).toHaveValue("내보낸 흥부 문장");
});

for (const failure of ["empty", "unknown-asset"] as const) {
  test(`${failure} imported document leaves the editor intact`, async ({
    page,
  }) => {
    await page.goto("/?view=editor");
    await page.getByLabel("대사 / 해설").fill("가져오기 실패 시 보존할 문장");
    const project = JSON.parse(
      readFileSync("tests/fixtures/stories/seonnyeo.json", "utf8"),
    );
    if (failure === "empty") {
      project.lines = [];
      project.chapters = [];
    } else project.lines[0].backgroundId = "missing.background.id";
    const document = {
      documentType: "story-maker-project",
      schemaVersion: 5,
      savedAt: "2026-10-06T00:00:00.000Z",
      appVersion: "boundary-test",
      project,
    };
    await page
      .getByLabel("작품 파일 가져오기")
      .setInputFiles({
        name: `${failure}.knolstory`,
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(document)),
      });
    await expect(page.getByTestId("workspace-error")).toContainText(
      "현재 작품은 유지됩니다",
    );
    await expect(page.getByLabel("대사 / 해설")).toHaveValue(
      "가져오기 실패 시 보존할 문장",
    );
  });
}

test('reading position and branch history resume after reload', async ({ page }) => {
  await page.goto('/?view=editor');
  await page.getByLabel('작품 선택').selectOption('heungbu');
  await page.getByRole('button', { name: '현재 컷부터 읽기' }).click();
  await page.getByRole('button', { name: '다음으로', exact: true }).click();
  const current = await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id');
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.path.length)).toBe(2);
  await page.reload();
  await expect(page.getByRole('button', { name: '편집으로', exact: true })).toBeVisible();
  await expect(page.locator(`[data-line-id="${current}"]`)).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: '이전으로', exact: true }).click();
  await expect(page.locator(`[data-line-id="${current}"]`)).not.toHaveAttribute('aria-current', 'true');
});
