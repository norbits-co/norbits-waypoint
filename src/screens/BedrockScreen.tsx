import { Check } from "lucide-react";

import { ServerAddress } from "../components/ServerAddress";

type Props = {
  address: string;
};

// No .minecraft folder means the player is almost certainly on Bedrock Edition.
export function BedrockScreen({ address }: Props) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-4 text-center">
      <div className="bg-wp-green grid h-10 w-10 place-items-center rounded-full">
        <Check className="h-5 w-5 text-white" strokeWidth={3} />
      </div>

      <p className="text-wp-title text-[15px] font-medium">
        Oh! Looks Like You're on Minecraft Bedrock Edition : )
      </p>
      <p className="text-wp-sub text-[14px]">
        You're all set! - just open Minecraft and connect to the server:
      </p>

      <ServerAddress address={address} />

      <p className="text-wp-muted text-[13px]">
        Certain add-ons are only available on Java Edition - Bedrock players can still join and
        play.
      </p>
    </div>
  );
}
