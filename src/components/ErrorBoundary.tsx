import { SiDiscord } from "@icons-pack/react-simple-icons";
import { Folder } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { client } from "../api";
import { DISCORD_URL } from "../config";
import { Button } from "./Button";

type Props = { children: ReactNode };
type State = { crashed: boolean };

// Catches a crash during render and shows something instead of a blank window.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Into the log file.
    client
      .logError(`${error.message}\n${info.componentStack ?? "no component stack"}`)
      .catch(() => {});
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <div className="bg-wp-body grid min-h-screen place-items-center p-10">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <p className="text-wp-title text-[15px] font-medium">Something Went Wrong... : /</p>
          <p className="text-wp-danger text-[14px]">
            Waypoint ran into a problem and had to stop. Nothing was changed in your game. Please
            restart the app, and let us know if it keeps happening.
          </p>

          <div className="flex justify-center gap-2.5">
            <Button size="pill" onClick={() => client.openUrl(DISCORD_URL)}>
              <SiDiscord className="h-4 w-4 shrink-0" />
              Get Help
            </Button>
            <Button variant="ghost" size="pill" onClick={() => client.openLogFolder()}>
              <Folder className="h-4 w-4 shrink-0" />
              Open Logs
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
