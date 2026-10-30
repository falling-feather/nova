import "./tech.css";

const MOTION_KEY = "nova-creator-motion-v1";
const SURFACES =
  ".contact-sheet,.inspector-photo,.network-svg-host,.diagram-viewport,.world-pane,.training-network,.exhibit-hero";

/** Decorative motion is device-local; it never changes learning evidence. */
export function installTechExperience(
  root: HTMLElement,
  chapter: 10 | 11 | 12 | 13,
) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let preference: string | null = null;
  try {
    preference = localStorage.getItem(MOTION_KEY);
  } catch {
    /* Optional device preference. */
  }
  let enabled = preference ? preference === "on" : !reduced.matches,
    frame = 0,
    surface: HTMLElement | null = null,
    targetX = 0,
    targetY = 0,
    x = 0,
    y = 0,
    settled = true;
  const pointer = document.createElement("div");
  pointer.className = "tech-pointer";
  pointer.setAttribute("aria-hidden", "true");
  pointer.innerHTML = "<i></i><b></b>";
  document.body.append(pointer);
  document.documentElement.dataset.techChapter = String(chapter);
  const allowed = () =>
    enabled && !document.hidden && !root.querySelector("dialog[open]");
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    settled = true;
    pointer.classList.remove("visible");
    if (surface) delete surface.dataset.pointerActive;
    surface = null;
  }
  function sync() {
    document.documentElement.dataset.techMotion = enabled ? "on" : "off";
    document.documentElement.dataset.techPreference = preference ?? "system";
    document.documentElement.dataset.reducedMotion = String(reduced.matches);
    document.documentElement.dataset.techSuspended =
      document.hidden || !!root.querySelector("dialog[open]")
        ? "true"
        : "false";
    if (!allowed() || (surface && !surface.isConnected)) stop();
    const host = root.querySelector(".header-tools");
    if (host) {
      let button = host.querySelector<HTMLButtonElement>("[data-tech-motion]");
      if (!button) {
        button = document.createElement("button");
        button.dataset.techMotion = "";
        button.className = "tech-motion-toggle";
        host.prepend(button);
      }
      const label = enabled ? "动效 开" : "动效 关";
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute(
        "aria-label",
        enabled ? "关闭动态效果" : "开启动态效果",
      );
      button.setAttribute("aria-pressed", String(enabled));
      button.title =
        (preference === null ? "当前跟随系统偏好。" : "当前使用本机选择。") +
        "关闭装饰跟随、光流与过渡；像素检视和真实工具仍可使用。";
    }
    root.querySelectorAll<HTMLElement>(SURFACES).forEach((item) => {
      item.dataset.techSurface = "";
    });
  }
  function draw() {
    frame = 0;
    if (!allowed() || !surface?.isConnected) {
      stop();
      return;
    }
    x += (targetX - x) * 0.24;
    y += (targetY - y) * 0.24;
    pointer.style.transform = `translate3d(${x - 18}px,${y - 18}px,0)`;
    if (Math.hypot(targetX - x, targetY - y) > 0.3) {
      frame = requestAnimationFrame(draw);
    } else settled = true;
  }
  function move(event: PointerEvent) {
    if (event.pointerType === "touch" || !allowed()) return;
    const next = (event.target as Element).closest<HTMLElement>(
      "[data-tech-surface]",
    );
    if (!next) {
      stop();
      return;
    }
    if (next !== surface) {
      if (surface) delete surface.dataset.pointerActive;
      surface = next;
      surface.dataset.pointerActive = "true";
      x = event.clientX;
      y = event.clientY;
    }
    targetX = event.clientX;
    targetY = event.clientY;
    const rect = surface.getBoundingClientRect();
    surface.style.setProperty("--pointer-x", `${targetX - rect.left}px`);
    surface.style.setProperty("--pointer-y", `${targetY - rect.top}px`);
    surface.style.setProperty(
      "--field-x",
      `${((targetX - rect.left) / rect.width - 0.5) * 5}px`,
    );
    surface.style.setProperty(
      "--field-y",
      `${((targetY - rect.top) / rect.height - 0.5) * 5}px`,
    );
    pointer.classList.add("visible");
    pointer.classList.toggle(
      "targeted",
      !!(event.target as Element).closest(
        "button,[data-neuron],[data-scene-tool]",
      ),
    );
    if (settled || !frame) {
      settled = false;
      frame = requestAnimationFrame(draw);
    }
  }
  function toggle(event: Event) {
    const button = (event.target as Element).closest(
      "button[data-tech-motion]",
    );
    if (!button) return;
    enabled = !enabled;
    preference = enabled ? "on" : "off";
    try {
      localStorage.setItem(MOTION_KEY, preference);
    } catch {
      /* Motion still changes for this visit. */
    }
    sync();
  }
  function preferenceChange() {
    if (preference === null) {
      enabled = !reduced.matches;
      sync();
    }
  }
  const observer = new MutationObserver(sync);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["open"],
  });
  root.addEventListener("pointermove", move, { passive: true });
  root.addEventListener("pointerleave", stop);
  root.addEventListener("click", toggle);
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", preferenceChange);
  sync();
  return {
    sync,
    dispose() {
      stop();
      observer.disconnect();
      pointer.remove();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", stop);
      root.removeEventListener("click", toggle);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", preferenceChange);
    },
  };
}

export function pulseTransfer(from: DOMRect, to: DOMRect) {
  if (
    document.documentElement.dataset.techMotion !== "on" ||
    document.hidden ||
    document.querySelector("dialog[open]")
  )
    return;
  const particle = document.createElement("i");
  particle.className = "tech-transfer";
  particle.setAttribute("aria-hidden", "true");
  document.body.append(particle);
  const ax = from.x + from.width / 2,
    ay = from.y + from.height / 2,
    bx = to.x + to.width / 2,
    by = to.y + to.height / 2;
  const animation = particle.animate(
    [
      {
        transform: `translate(${ax}px,${ay}px) rotate(45deg) scale(.6)`,
        opacity: 0,
      },
      {
        offset: 0.18,
        transform: `translate(${ax + (bx - ax) * 0.15}px,${ay - 25}px) rotate(70deg)`,
        opacity: 0.9,
      },
      {
        transform: `translate(${bx}px,${by}px) rotate(135deg) scale(.3)`,
        opacity: 0,
      },
    ],
    { duration: 520, easing: "cubic-bezier(.2,.7,.2,1)" },
  );
  animation.finished.then(
    () => particle.remove(),
    () => particle.remove(),
  );
}
