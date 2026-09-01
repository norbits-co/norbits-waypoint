import { SiDiscord } from "@icons-pack/react-simple-icons";
import { Folder } from "lucide-react";

import { client } from "../api";
import { Button } from "../components/Button";
import { DISCORD_URL } from "../config";
import { asksForContact } from "../utils/errors";

type Props = {
  message: string;
};

// The message comes from the backend, which writes it for players.
export function FailedScreen({ message }: Props) {
  return (
    <div className="flex max-w-md flex-col items-center gap-4 text-center">
      <p className="text-wp-title text-[15px] font-medium">Something Went Wrong... : /</p>
      <p className="text-wp-danger text-[14px]">{message}</p>

      {asksForContact(message) && (
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
      )}
    </div>
  );
}
