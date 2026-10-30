import assert from "node:assert/strict";

/** Shared DOM actions for the isolated course test and the real forest journey. */
export function lessonActions(page, readState) {
  const click = async (action) => page.locator(`[data-action="${action}"]:visible`).click();
  const choose = async (label, value) =>
    page
      .locator(`[role="radiogroup"][aria-label="${label}"] [data-value="${value}"]:visible`)
      .click();
  const range = async (label, value) => {
    const input = page.getByRole("slider", { name: label, exact: true });
    assert.ok(await input.isVisible(), label);
    await input.evaluate((input, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  };
  const stepSelector = ".lesson-next";
  const currentKind = async () => (await readState()).observations.at(-1).options.kind;
  async function stepAction(step) {
    const value = step.done.type === "option" ? step.done.value : null;
    switch (step.unit) {
      case "wipe":
        for (let n = 0; n < 8 && !(await page.locator(stepSelector).isVisible()); n++)
          await click("wipe");
        break;
      case "cover":
        await range("叶子挡住了多少", value ?? 0);
        break;
      case "angle":
        await range("转一转", value);
        break;
      case "light":
        await range("光线", value);
        break;
      case "noise":
        await range("周围有多吵", value);
        break;
      case "background":
        await choose("背景纸", value);
        break;
      case "kind":
        await choose("观察的东西", value);
        break;
      case "variant": {
        let now =
          Number((await page.locator(".stepper-word:visible").innerText()).match(/\d+/)[0]) - 1;
        const button = page.getByRole("button", {
          name: `换一个同类的：${value > now ? "下一个" : "上一个"}`,
          exact: true,
        });
        for (let n = 0; n < Math.abs(value - now); n++) await button.click();
        break;
      }
      case "capture":
      case "verify":
      case "compare":
      case "label-source":
      case "add-example":
      case "model-check":
      case "sound-predict":
      case "sound-verify":
      case "message-first":
      case "message-second":
      case "text-predict":
      case "motion-predict":
      case "motion-verify":
      case "fuse":
      case "attribute-source":
      case "train":
      case "compare-models":
      case "freeze":
      case "test-known":
      case "test-heldout":
        await click(step.unit);
        break;
      case "result":
        assert.ok(await page.locator(".assistant-card:visible").count());
        break;
      case "label":
        await choose("这张照片是", await currentKind());
        await click("confirm-label");
        break;
      case "listen":
        await click("listen");
        break;
      case "sound-select":
        await choose("选一份录音", value);
        break;
      case "improve":
        await choose("下一步，怎么补救", "靠近声源重新录");
        break;
      case "tool-choose":
        await choose("这份文字，交给哪个工具？", "文字线索");
        break;
      case "motion-scrub":
        for (const p of [0, 50, 100]) await range("短片进度", p);
        break;
      case "fusion-question":
        await choose("这一次问的是", value);
        break;
      case "fusion-source":
        await page.getByLabel("我核对过这些线索的来源", { exact: true }).check();
        break;
      case "clue-read":
        await click("read-clue");
        break;
      case "sort-color":
      case "sort-use": {
        const mode = step.unit === "sort-color" ? "color" : "use";
        if (mode === "use") await choose("这次怎么分", "use");
        const items = [
          ["car", "红色", "玩具"],
          ["maple", "红色", "自然观察"],
          ["bell", "黄色", "会响的东西"],
          ["ginkgo", "黄色", "自然观察"],
          ["radio", "绿色", "会响的东西"],
          ["leaf", "绿色", "自然观察"],
        ];
        for (const item of items) {
          await click("sort-item-" + item[0]);
          await click("bin-" + item[mode === "color" ? 1 : 2]);
        }
        break;
      }
      case "attribute-name":
        await choose("名字标签", "小车");
        break;
      case "attribute-color":
        await choose("颜色标签", "红色");
        break;
      case "attribute-material":
        await choose("材料标签", "木头");
        break;
      case "unknown":
        await choose("我还不确定，因为", "两份便签的名字互相矛盾");
        await click("save-unknown");
        break;
      case "packet-open":
        await click("open-packet");
        break;
      case "example-edit": {
        const wrong = page.locator('select[data-example-id="repair-visitor-car-1-blue"]');
        for (let n = 0; n < 40 && !(await wrong.isVisible()); n++) await click("example-next");
        await page.locator(".example-source:visible summary").click();
        await wrong.selectOption("car");
        break;
      }
      case "album-save":
        await click("save-album");
        break;
      case "delivery":
        await choose("失物袋里有这些，交还哪一件？", "bell");
        await click("deliver");
        break;
      case "archive-content":
        await choose("听到的是", (await readState()).evidence["22"].lesson.soundKind);
        break;
      case "archive-source": {
        const k = (await readState()).evidence["22"].lesson.soundKind;
        await choose("声音从哪里来", k === "bird" ? "播放器" : "溪水");
        break;
      }
      case "archive-save":
        await click("archive-sound");
        break;
      case "rain-choice":
        await choose("我的决定", "补拍并核对后再处理");
        await click("rain-decision");
        break;
      case "author-title":
        await page.getByLabel("委托名称", { exact: true }).fill("树屋边的声音");
        break;
      case "author-question":
        await page
          .getByLabel("我要问的问题", { exact: true })
          .fill("照片里是什么东西？请一起核对照片与录音。");
        break;
      case "author-explanation":
        await page
          .getByLabel("给访客的核对说明", { exact: true })
          .fill("先看实物的形状，再查声源资料，不把播放的内容当成物件。");
        break;
      case "author-materials":
        await page.locator('[data-material="sound"]').click();
        break;
      case "author-object":
        await choose("照片里放什么", "bell");
        break;
      case "author-cover":
        await range("给访客留多少遮挡", 0.3);
        break;
      case "author-save":
        await click("save-author");
        break;
      case "author-test":
        await click("test-author");
        break;
      default:
        throw Error("Unhandled unit " + step.unit);
    }
  }
  return { click, choose, range, stepAction };
}
