export function isOwner(recipeUserId: string | undefined, sessionUserId: string | undefined): boolean {
  if (!recipeUserId) return false;
  if (!sessionUserId) return false;
  return recipeUserId === sessionUserId;
}
