import { ACTIVITY_CONTEXTS, RESIDENTS } from "../content/habitats.ts";
import type {
  ActivityContext,
  LifeInteraction,
  Resident,
} from "../content/habitats.ts";
import { ACTIVITIES } from "../content/activities.ts";
import { canReach } from "../core/world.ts";
import { objectiveGuide } from "../core/objective-guide.ts";
import { button, el, icon, iconButton } from "./dom.ts";
import "./living.css";

export interface LivingActions {
  close(): void;
  goToActivity(activityId: string): void;
  activate(interactionId: string): void;
}
export interface LivingPanel {
  showResident(
    resident: Resident,
    activeActivityId: string,
    phase: number,
  ): void;
  showInteraction(item: LifeInteraction, message: string): void;
  close(): void;
  isOpen(): boolean;
}

let livingPanelNumber = 0;

function contextFor(
  resident: Resident,
  activeActivityId: string,
  phase: number,
): ActivityContext | undefined {
  const activeIndex = ACTIVITIES.findIndex(
    (activity) => activity.id === activeActivityId,
  );
  const available = ACTIVITY_CONTEXTS.filter((context) => {
    if (context.residentId !== resident.id) return false;
    const activityIndex = ACTIVITIES.findIndex(
      (item) => item.id === context.activityId,
    );
    // An open region may contain later tasks; the course still advances in activity order.
    if (activityIndex < 0 || activityIndex > activeIndex) return false;
    const activity = ACTIVITIES[activityIndex];
    return (
      activity.phase <= phase && canReach(activity.x, activity.elevation, phase)
    );
  });
  return (
    available.find((context) => context.activityId === activeActivityId) ??
    available.sort((a, b) => {
      const aX = ACTIVITIES.find((activity) => activity.id === a.activityId)!.x;
      const bX = ACTIVITIES.find((activity) => activity.id === b.activityId)!.x;
      return Math.abs(aX - resident.x) - Math.abs(bX - resident.x);
    })[0]
  );
}

/** A small, nonmodal conversation. Only the caller owns navigation, effects and learning state. */
export function createLivingPanel(
  host: HTMLElement,
  actions: LivingActions,
): LivingPanel {
  host.classList.add("living-panel-host");
  const panel = el("section", "living-panel");
  const titleId = `living-title-${++livingPanelNumber}`;
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", titleId);
  host.append(panel);
  let open = false;
  let previousFocus: HTMLElement | null = null;

  function close(): void {
    if (!open) return;
    open = false;
    panel.hidden = true;
    document.removeEventListener("keydown", onKeydown, true);
    if (previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function dismiss(): void {
    close();
    actions.close();
  }
  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    dismiss();
  }
  function begin(
    name: string,
    role: string,
  ): {
    body: HTMLElement;
    footer: HTMLElement;
    closeButton: HTMLButtonElement;
  } {
    if (!open) {
      previousFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      document.addEventListener("keydown", onKeydown, true);
    }
    open = true;
    const header = el("header", "living-heading");
    const mark = el("span", "living-mark");
    mark.append(icon("leaf"));
    const heading = el("div", "living-identity");
    const title = el("h2", "", name);
    title.id = titleId;
    heading.append(el("span", "living-role", role), title);
    const closeButton = iconButton(
      "收起对话",
      "close",
      dismiss,
      "living-close",
    );
    header.append(mark, heading, closeButton);
    const body = el("div", "living-copy");
    const footer = el("footer", "living-actions");
    panel.replaceChildren(header, body, footer);
    panel.hidden = false;
    return { body, footer, closeButton };
  }

  return {
    showResident(resident, activeActivityId, phase) {
      const { body, footer, closeButton } = begin(resident.name, resident.role);
      const context = contextFor(resident, activeActivityId, phase);
      body.append(el("p", "living-greeting", resident.greeting));
      body.append(el("p", "living-routine", resident.routine.description));
      const note = el("div", "living-request");
      if (context?.activityId !== activeActivityId) {
        const goal=objectiveGuide(resident,activeActivityId,phase,[]);
        const active=ACTIVITIES.find(item=>item.id===activeActivityId)!;
        note.append(el("span","living-place","当前探索的路线"),
          el("p","",`你现在的探索是「${active.title}」。去${goal!.place}，帮${goal!.ownerName}看看这份委托。`),
          el("p","living-look",`${goal!.instruction}。跟着方向牌走，到达后找金色箭头。`));
        footer.append(button("前往当前委托",()=>{close();actions.goToActivity(activeActivityId)},"living-action living-action-primary","pin"));
        if(context) footer.append(button("回看这里的旧委托",()=>{close();actions.goToActivity(context.activityId)},"living-action"));
      } else if (context) {
        note.append(
          el("span", "living-place", context.place),
          el("p", "", context.request),
          el("p", "living-look", context.lookFor),
        );
        footer.append(
          button(
            "去看看委托",
            () => {
              close();
              actions.goToActivity(context.activityId);
            },
            "living-action living-action-primary",
            "pin",
          ),
        );
      } else {
        note.append(
          el("p", "", resident.taskHint),
          el("p", "living-look", resident.lookHint),
        );
      }
      body.append(note);
      footer.append(button("一会儿见", dismiss, "living-action"));
      closeButton.focus({ preventScroll: true });
    },
    showInteraction(item, message) {
      const resident = RESIDENTS.find(
        (resident) => resident.id === item.residentId,
      )!;
      const { body, footer, closeButton } = begin(
        item.name,
        `${resident.name} · ${resident.role}`,
      );
      const response = el("p", "living-response", message);
      response.setAttribute("role", "status");
      body.append(response);
      footer.append(
        button(
          item.actionLabel,
          () => actions.activate(item.id),
          "living-action living-action-primary",
          "spark",
        ),
        button("继续散步", dismiss, "living-action"),
      );
      closeButton.focus({ preventScroll: true });
    },
    close,
    isOpen: () => open,
  };
}
