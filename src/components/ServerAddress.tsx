import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";

type Props = {
  address: string;
};

// The server address with a copy button. Used on the Bedrock screen, and wanted
export function ServerAddress({ address }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(address).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      // Clipboard access can be refused; leaving the icon unchanged is the
      () => {}
    );
  }

  return (
    <div className="border-wp-panel-border bg-wp-panel flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="flex flex-col gap-0.5 text-left">
        <span className="text-wp-muted text-[11px] tracking-wide uppercase">Server address</span>
        <span className="text-wp-title font-mono text-[17px]">{address}</span>
      </div>

      <Button
        size="icon"
        onClick={handleCopy}
        title="Copy Server Address"
        aria-label="Copy Server Address"
      >
        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
      </Button>
    </div>
  );
}
