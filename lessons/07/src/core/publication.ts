import { newsClaims } from "./news.ts";
export interface Draft {
  headline: string; opening: string; ai: string; edited: string;
  proof?: { signature: string; facts: boolean; readability: boolean; attribution: boolean };
}
export function draftSignature(draft: Draft): string {
  return JSON.stringify([draft.headline.trim(), draft.opening.trim(), draft.ai, draft.edited]);
}
export function publicationConflicts(draft: Draft) {
  return newsClaims([draft.headline, draft.opening, draft.edited].join("\n")).filter(claim => !claim.correct);
}
export function canPublish(draft: Draft): boolean {
  return !!(draft.headline.trim() && draft.opening.trim() && draft.ai && draft.proof?.signature === draftSignature(draft)
    && draft.proof.facts && draft.proof.readability && draft.proof.attribution
    && publicationConflicts(draft).length === 0);
}
