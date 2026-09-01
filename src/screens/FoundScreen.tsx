import { Check } from "lucide-react";

import { Button } from "../components/Button";

type Props = {
  onSetUp: () => void;
};

export function FoundScreen({ onSetUp }: Props) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="bg-wp-green grid h-10 w-10 place-items-center rounded-full">
        <Check className="h-5 w-5 text-white" strokeWidth={3} />
      </div>
      <p className="text-wp-title text-[15px] font-medium">Found Minecraft!</p>
      <Button onClick={onSetUp}>Set Up My Game</Button>
    </div>
  );
}
