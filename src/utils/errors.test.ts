import { describe, expect, it } from "vitest";

import { asksForContact, errorMessage } from "./errors";

describe("errorMessage", () => {
  it("passes through the plain string Tauri rejects with", () => {
    // The real backend rejects with the String from Err(String).
    expect(errorMessage("Voice Chat isn't ready for Minecraft 26.2 yet.")).toBe(
      "Voice Chat isn't ready for Minecraft 26.2 yet."
    );
  });

  it("unwraps an Error rather than showing its 'Error:' prefix", () => {
    // The mocks throw Error objects. String(e) on one of those prepends
    expect(errorMessage(new Error("Couldn't reach NorBits."))).toBe("Couldn't reach NorBits.");
  });

  it("falls back to something readable for anything else", () => {
    // Whatever this is, a player must not see "[object Object]".
    for (const odd of [undefined, null, 42, { code: 500 }]) {
      const msg = errorMessage(odd);
      expect(msg).not.toContain("object Object");
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});

describe("asksForContact", () => {
  // These are the exact strings error.rs produces. If the wording changes on that side without changing it here, the Discord and Open Logs buttons
  // silently stop appearing.

  it("is true for failures the player can do nothing about", () => {
    expect(
      asksForContact(
        "Something went wrong getting your game ready. Please try again, and let us know if it keeps happening."
      )
    ).toBe(true);

    expect(
      asksForContact(
        "Couldn't reach NorBits. Please try again, and let us know if it keeps happening."
      )
    ).toBe(true);
  });

  it("is false for failures the player can fix themselves", () => {
    // Offering a support link to someone whose wifi is off is noise.
    expect(
      asksForContact("Couldn't reach NorBits. Check your internet connection and try again.")
    ).toBe(false);

    expect(asksForContact("Minecraft 26.2 isn't supported yet.")).toBe(false);
    expect(asksForContact("Voice Chat isn't ready for Minecraft 26.2 yet.")).toBe(false);
  });
});
