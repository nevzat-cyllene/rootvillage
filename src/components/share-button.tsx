"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ShareButton({
  title,
  text,
  url,
  label = "Paylaş",
}: {
  title: string;
  text: string;
  url?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const href = url ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: href });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button variant="secondary" onClick={() => void share()}>
      {copied ? "Link kopyalandı" : label}
    </Button>
  );
}
