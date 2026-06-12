import React from "react";

export default function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-wordmark ${className}`.trim()}>
      <span className="brand-wordmark__tech">Tech</span>
      <span className="brand-wordmark__everyday">Everyday</span>
    </span>
  );
}
