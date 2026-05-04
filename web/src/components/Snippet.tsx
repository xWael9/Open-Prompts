import React, { useRef, useState } from "react";

interface SnippetProps {
  text: string | string[];
  width?: string;
  onCopy?: () => void;
  prompt?: boolean;
  dark?: boolean;
}

export const Snippet = ({ text, width = "100%", onCopy, prompt = true }: SnippetProps) => {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lines = typeof text === "string" ? [text] : text;

  const handleCopy = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setCopied(true);
    timeout.current = setTimeout(() => setCopied(false), 2000);
    navigator.clipboard.writeText(lines.join("\n"));
    onCopy?.();
  };

  return (
    <div className="flex items-center px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors" style={{ width }}>
      <div className="flex-1 min-w-0 overflow-x-auto mr-2">
        {lines.map((item) => (
          <div key={item} className={`font-mono text-[12px] whitespace-nowrap text-gray-700 ${prompt ? "before:content-['$_'] before:text-gray-400" : ""}`}>
            {item}
          </div>
        ))}
      </div>
      <button onClick={handleCopy} className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors" aria-label="Copy">
        <svg height="14" viewBox="0 0 16 16" width="14" className={`transition-opacity duration-200 ${copied ? "hidden" : "block"}`} fill="#9CA3AF">
          <path fillRule="evenodd" clipRule="evenodd" d="M2.75 0.5C1.7835 0.5 1 1.2835 1 2.25V9.75C1 10.7165 1.7835 11.5 2.75 11.5H4.5V10H2.75C2.61193 10 2.5 9.88807 2.5 9.75V2.25C2.5 2.11193 2.61193 2 2.75 2H8.25C8.38807 2 8.5 2.11193 8.5 2.25V3H10V2.25C10 1.2835 9.2165 0.5 8.25 0.5H2.75ZM7.75 4.5C6.7835 4.5 6 5.2835 6 6.25V13.75C6 14.7165 6.7835 15.5 7.75 15.5H13.25C14.2165 15.5 15 14.7165 15 13.75V6.25C15 5.2835 14.2165 4.5 13.25 4.5H7.75ZM7.5 6.25C7.5 6.11193 7.61193 6 7.75 6H13.25C13.3881 6 13.5 6.11193 13.5 6.25V13.75C13.5 13.8881 13.3881 14 13.25 14H7.75C7.61193 14 7.5 13.8881 7.5 13.75V6.25Z" />
        </svg>
        <svg height="14" viewBox="0 0 16 16" width="14" className={`transition-opacity duration-200 ${copied ? "block" : "hidden"}`} fill="#10B981">
          <path fillRule="evenodd" clipRule="evenodd" d="M15.5607 3.99999L15.0303 4.53032L6.23744 13.3232C5.55403 14.0066 4.44599 14.0066 3.76257 13.3232L0.969676 10.5303L0.439346 9.99999L1.50001 8.93933L2.03034 9.46966L4.82323 12.2626C4.92086 12.3602 5.07915 12.3602 5.17678 12.2626L13.9697 3.46966L14.5 2.93933L15.5607 3.99999Z" />
        </svg>
      </button>
    </div>
  );
};
