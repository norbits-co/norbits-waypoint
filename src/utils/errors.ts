// Tauri rejects with the plain string from `Err(String)`
export function errorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return "Something went wrong. Please try again.";
}

// Whether a failure should offer the player a way to reach us.

export function asksForContact(message: string): boolean {
  return message.includes("let us know");
}
