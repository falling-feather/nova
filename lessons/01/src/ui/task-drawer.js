/* Display state only. Learning remains the authority for a new completion. */
(function (G) {
  function TaskDrawer() {
    this.card = document.querySelector("#objective");
    this.toggle = document.querySelector("#objectiveToggle");
    this.label = document.querySelector("#objectiveToggleLabel");
    this.notice = document.querySelector("#objectiveUpdate");
    this.toggle.onclick = () => this.set(!this.expanded);
    document.querySelector("#objectiveCollapse").onclick = () => {
      this.set(false);
      this.toggle.focus({ preventScroll: true });
    };
    this.reset();
  }
  TaskDrawer.prototype.set = function (expanded) {
    this.expanded = expanded;
    if (!expanded && this.card.contains(document.activeElement))
      this.toggle.focus({ preventScroll: true });
    this.card.hidden = !expanded;
    this.card.inert = !expanded;
    this.toggle.setAttribute("aria-expanded", String(expanded));
    this.toggle.setAttribute(
      "aria-label",
      expanded ? "收起任务栏" : "展开任务栏",
    );
    this.label.textContent = expanded ? "收起任务" : "任务";
    document.body.classList.toggle("objectiveExpanded", expanded);
  };
  TaskDrawer.prototype.complete = function (title) {
    this.notice.textContent = "✓ " + title + " · 完成啦";
    this.notice.hidden = false;
    this.set(true);
  };
  TaskDrawer.prototype.reset = function () {
    this.notice.hidden = true;
    this.set(false);
  };
  G.TownTaskDrawer = TaskDrawer;
})(globalThis);
