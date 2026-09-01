import { LoaderCircle } from "lucide-react";

export function SearchingScreen() {
  return (
    <div className="flex flex-col items-center gap-4">
      <LoaderCircle className="text-wp-accent h-8 w-8 animate-spin" strokeWidth={2.5} />
      <p className="text-wp-sub text-[15px] font-medium">Looking for Minecraft...</p>
    </div>
  );
}
