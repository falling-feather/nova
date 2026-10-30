import { itemById, items, roomById, resolveRoomId } from "./content.js";
import { researchCard,learningTasks } from "./learning.js";
export function sanitizeProgress(raw) {
  const research = researchCard(raw?.research || {});
  return {
    visited: [
      ...new Set(
        (Array.isArray(raw?.visited) ? raw.visited : []).filter(
          (id) => typeof id === "string" && itemById[id],
        ),
      ),
    ],
    note: typeof raw?.note === "string" ? raw.note.slice(0, 280) : "",
    investigations: [
      ...new Set(
        (Array.isArray(raw?.investigations) ? raw.investigations : []).filter(
          (id) => typeof id === "string" && Object.hasOwn(learningTasks, id),
        ),
      ),
    ],
    research: research.ok ? research.fields : null,
  };
}
export function createState(progress) {
  return { roomId: "atrium", itemId: null, ...sanitizeProgress(progress) };
}
export function visitRoom(state, id, { preserveItem = false } = {}) {
  return id === "atrium" || id==='future' || Object.hasOwn(roomById,id)
    ? { ...state, roomId: resolveRoomId(id), itemId: preserveItem ? state.itemId : null }
    : state;
}
export function selectItem(state, id) {
  const item = itemById[id];
  return item
    ? { ...state, itemId: id, visited: [...new Set([...state.visited, id])] }
    : state;
}
export function completeInvestigation(state, id) {
  return Object.hasOwn(learningTasks, id)
    ? { ...state, investigations: [...new Set([...state.investigations, id])] }
    : state;
}
export function saveResearchCard(state, fields) {
  const card = researchCard(fields || {});
  return card.ok ? { ...state, research: card.fields } : state;
}
export function searchItems(query = "", kind = "all") {
  const q = query.trim().toLocaleLowerCase();
  return items.filter(
    (i) =>
      (kind === "all" || i.kind === kind) &&
      (!q || i.search.toLocaleLowerCase().includes(q)),
  );
}
