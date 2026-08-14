"use client";

import { useState } from "react";

// The logo is a full wordmark lockup (BSR + crest + "British Stunt Register Committee"),
// white-on-transparent — designed for dark backgrounds only, not the plain white card style.
export function Logo({ width = 220, className }: { width?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/web-logo.png" alt="BSR — British Stunt Register Committee" style={{ width, height: "auto", display: "block" }} className={className} onError={() => setFailed(true)} />;
}
