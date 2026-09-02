import { Check } from "lucide-react";

export function DoneScreen() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-wp-green grid h-10 w-10 place-items-center rounded-full">
        <Check className="h-5 w-5 text-white" strokeWidth={3} />
      </div>
      <p className="text-wp-title text-[15px] font-medium">You're All Set!</p>
      <p className="text-wp-sub text-center text-[14px]">
        Open Minecraft and look for the NorBits profile in your launcher.
      </p>
    </div>
  );
}
