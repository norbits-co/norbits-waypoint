import type { ThemeName } from "../hooks/useTheme";

type Props = {
  theme: ThemeName;
  onToggleTheme: () => void;
};

// The custom title bar. `data-tauri-drag-region` makes it draggable; that only
export function TitleBar({ theme, onToggleTheme }: Props) {
  return (
    <header
      data-tauri-drag-region=""
      className="border-wp-bar-border bg-wp-bar flex h-[38px] shrink-0 items-center justify-between border-b px-3"
    >
      <div className="flex items-center gap-2">
        <div className="bg-wp-accent grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full">
          <div className="bg-wp-bar h-[5.5px] w-[5.5px] rotate-45" />
        </div>
        <span className="text-wp-bar-text text-xs font-medium">NorBits Waypoint</span>
      </div>

      <button
        onClick={onToggleTheme}
        title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
        aria-label={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
        className="text-wp-glyph grid h-[38px] w-[42px] cursor-pointer place-items-center border-0 bg-transparent hover:bg-[rgba(127,127,127,.16)]"
      >
        <span
          className="block h-[13px] w-[13px] rounded-full border-2 border-current"
          style={{
            background: "linear-gradient(90deg, currentColor 0 50%, transparent 50% 100%)",
          }}
        />
      </button>
    </header>
  );
}
