import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { InstallPlan, PlannedMod } from "../api";
import { ConfirmScreen } from "./ConfirmScreen";

function mod(filename: string, size = 1_000_000, name = "Voice Chat"): PlannedMod {
  return {
    projectId: "x",
    version: "1.0.0",
    name,
    filename,
    url: "https://example.invalid/a.jar",
    size,
    sha512: "abc",
    requested: true,
  };
}

function plan(over: Partial<InstallPlan> = {}): InstallPlan {
  return {
    mods: [
      mod("voicechat.jar", 1_200_000, "Voice Chat"),
      mod("fabric-api.jar", 1_900_000, "Supporting Files"),
    ],
    loaderVersion: "0.19.3",
    totalBytes: 3_100_000,
    staleFiles: [],
    ...over,
  };
}

const noop = () => {};

describe("what's being downloaded", () => {
  it("counts the files and shows the total size", () => {
    render(<ConfirmScreen plan={plan()} onInstall={noop} onCancel={noop} />);

    expect(screen.getByText(/2 files to download/i)).toBeInTheDocument();
    expect(screen.getByText("3.1 MB")).toBeInTheDocument();
  });

  it("says file rather than files when there's only one", () => {
    render(
      <ConfirmScreen
        plan={plan({ mods: [mod("voicechat.jar")], totalBytes: 1_200_000 })}
        onInstall={noop}
        onCancel={noop}
      />
    );

    expect(screen.getByText(/1 file to download/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 files/i)).not.toBeInTheDocument();
  });
});

describe("the details drawer", () => {
  it("is closed to begin with", () => {
    render(<ConfirmScreen plan={plan()} onInstall={noop} onCancel={noop} />);

    expect(screen.queryByText("Voice Chat")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /what's being installed/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("opens to show what's in the plan", async () => {
    render(<ConfirmScreen plan={plan()} onInstall={noop} onCancel={noop} />);

    await userEvent.click(screen.getByRole("button", { name: /what's being installed/i }));

    expect(screen.getByText("Voice Chat")).toBeInTheDocument();
    // Dependencies get a generic label - naming them would mean explaining them.
    expect(screen.getByText("Supporting Files")).toBeInTheDocument();
  });

  it("is a button, so it can be reached by keyboard", async () => {
    // It was a div with an onClick once. Querying by role keeps it from becoming one again.
    render(<ConfirmScreen plan={plan()} onInstall={noop} onCancel={noop} />);

    const toggle = screen.getByRole("button", { name: /what's being installed/i });
    toggle.focus();
    await userEvent.keyboard("{Enter}");

    expect(screen.getByText("Voice Chat")).toBeInTheDocument();
  });
});

describe("replacing older versions", () => {
  it("says so when there's something to replace", () => {
    render(
      <ConfirmScreen
        plan={plan({ staleFiles: ["voicechat-2.6.21.jar"] })}
        onInstall={noop}
        onCancel={noop}
      />
    );

    expect(screen.getByText(/older versions will be replaced/i)).toBeInTheDocument();
  });

  it("stays quiet on a fresh install", () => {
    render(<ConfirmScreen plan={plan({ staleFiles: [] })} onInstall={noop} onCancel={noop} />);

    expect(screen.queryByText(/older versions will be replaced/i)).not.toBeInTheDocument();
  });
});

describe("the two choices", () => {
  it("installs", async () => {
    const onInstall = vi.fn();
    render(<ConfirmScreen plan={plan()} onInstall={onInstall} onCancel={noop} />);

    await userEvent.click(screen.getByRole("button", { name: "Install" }));

    expect(onInstall).toHaveBeenCalledOnce();
  });

  it("backs out", async () => {
    const onCancel = vi.fn();
    render(<ConfirmScreen plan={plan()} onInstall={noop} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: /not now/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows no filenames, hashes, URLs or project IDs, even expanded", async () => {
    // The expanded view is for a nervous player, or the friend they asked to check it's safe.
    const distinctive = plan({
      mods: [
        {
          ...mod("FILENAMEFIXTURE.jar", 1_000_000, "Voice Chat"),
          sha512: "SHA512FIXTURE",
          url: "https://cdn.example.invalid/FIXTURE.jar",
          projectId: "PROJECTIDFIXTURE",
        },
      ],
    });

    const { container } = render(
      <ConfirmScreen plan={distinctive} onInstall={noop} onCancel={noop} />
    );

    await userEvent.click(screen.getByRole("button", { name: /what's being installed/i }));

    const text = container.textContent ?? "";
    expect(text).not.toContain("FILENAMEFIXTURE");
    expect(text).not.toContain("SHA512FIXTURE");
    expect(text).not.toContain("PROJECTIDFIXTURE");
    expect(text).not.toContain("https://");
    // The friendly name is what it should show instead.
    expect(text).toContain("Voice Chat");
  });
});
