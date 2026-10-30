import type { Course } from "../course/course.ts";
import { APPLES } from "../course/course.ts";
import { button as b, escape as e, icon } from "./dom.ts";
export type AtelierPage = "edit" | "tools" | "cards";

export function atelier(c: Course, page: AtelierPage) {
  if (c.hub || c.room !== "council") return "";
  const query = c.meeting.tokens[c.queryIndex];
  const header =
    '<header><div class="atelier-top"><span class="panel-kicker">案头编辑 · 上下文</span>' +
    b(
      icon("close"),
      "close-context",
      "",
      false,
      'class="close-button" aria-label="收起编辑台"',
    ) +
    '</div><h2>试一句你自己的话。</h2><div class="atelier-tabs">' +
    (
      [
        ["edit", "整句修改"],
        ["tools", "移动线索"],
        ["cards", "参考句子"],
      ] as const
    )
      .map(([key, label]) =>
        b(
          label,
          "atelier-page",
          key,
          false,
          'aria-pressed="' + (page === key) + '"',
        ),
      )
      .join("") +
    "</div></header>";
  const foot =
    '<div class="atelier-foot">' +
    b("把桌上这句留作原句", "capture-context", "a") +
    b("对照桌上这句", "compare-context") +
    "</div>";
  if (page === "tools")
    return (
      header +
      '<div class="atelier-content"><section class="activity-unit"><p>当前选中 <b>「' +
      e(query) +
      '」</b></p><label class="write-label">添加或替换一条线索<input data-field="context-token" maxlength="40" placeholder="写一个词或短线索" aria-label="新的线索词"></label><div class="context-edit-tools">' +
      b("插到后面", "insert-context") +
      b("替换它", "replace-context") +
      b("取出它", "remove-context") +
      '</div></section><div class="context-tray"><span>也可以直接把活字拖上桌</span>' +
      ["吃", "拍", "屏幕", "照片"]
        .map(
          (word) =>
            '<button class="context-chip" draggable="true" data-context-token="' +
            word +
            '" data-cmd="insert-context" data-value="' +
            word +
            '">' +
            word +
            "</button>",
        )
        .join("") +
      "</div></div>" +
      foot
    );
  if (page === "cards")
    return (
      header +
      '<div class="atelier-content"><p>选一张通讯卡，换一种上下文。</p><div class="context-examples">' +
      [APPLES[c.applePair].phone, APPLES[c.applePair].fruit]
        .map(
          (text) =>
            '<button draggable="true" data-context-sentence="' +
            e(text) +
            '" data-cmd="set-context" data-value="' +
            e(text) +
            '">' +
            e(text) +
            "</button>",
        )
        .join("") +
      "</div></div>" +
      foot
    );
  return (
    header +
    '<div class="atelier-content"><section class="activity-unit"><label class="write-label">修改后，再观察「' +
    e(query) +
    '」<input data-field="council-text" maxlength="200" value="' +
    e(c.currentText) +
    '" aria-label="自己的上下文句子"></label>' +
    b("排到桌上 · 观察变化", "apply-context", "", true) +
    '<p class="context-result">' +
    c.meeting.tokens.length +
    " 块词元 · 句子会在本机重新计算。</p></section></div>" +
    foot
  );
}
