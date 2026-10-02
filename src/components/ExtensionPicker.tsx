"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PRICE_TABLE, type CuratedTld } from "@/lib/rdap/tlds";

const PANEL_WIDTH = 380;
const GUTTER = 16;
const GAP = 12;

interface ExtensionPickerProps {
  /** Every extension the user can pick from, in display order. */
  options: readonly CuratedTld[];
  /** Extensions shown inline next to the button; the rest live in the panel. */
  pinned: readonly CuratedTld[];
  selected: Set<string>;
  onToggle: (tld: string) => void;
  onSetAll: (tlds: string[]) => void;
}

// Pinned chips inline, plus an "Add more" button that opens a frosted-glass
// panel. The panel is portalled to <body> because the search box clips its
// overflow (BorderGlow's inner wrapper), and it uses fixed positioning
// anchored to the button.
export function ExtensionPicker({ options, pinned, selected, onToggle, onSetAll }: ExtensionPickerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const extraSelected = [...selected].filter((tld) => !(pinned as readonly string[]).includes(tld)).length;

  // Positions the panel directly on the DOM node so it can be measured and
  // placed in the same layout pass (no flash, no extra render).
  const place = useCallback(() => {
    const button = buttonRef.current;
    const panel = panelRef.current;
    if (!button || !panel) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - GUTTER * 2);
    const left = Math.min(Math.max(GUTTER, rect.left), window.innerWidth - width - GUTTER);
    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;

    // Open downward when it fits, otherwise flip above the button (the search
    // box sits low in the hero, so above is the common case).
    const height = panel.offsetHeight;
    const below = rect.bottom + GAP;
    const fitsBelow = below + height <= window.innerHeight - GUTTER;
    panel.style.top = `${fitsBelow ? below : Math.max(GUTTER, rect.top - GAP - height)}px`;
    panel.style.visibility = "visible";
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return (
    <>
      {pinned.map((tld) => (
        <Chip key={tld} tld={tld} isOn={selected.has(tld)} onClick={() => onToggle(tld)} />
      ))}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition ${
          open
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-400 border-dashed text-slate-600 hover:border-slate-600 hover:text-slate-800"
        }`}
      >
        <span aria-hidden>+</span>
        Add more
        {extraSelected > 0 && (
          <span
            className={`rounded-full px-1.5 text-[10px] font-medium ${
              open ? "bg-white text-slate-900" : "bg-slate-900 text-white"
            }`}
          >
            {extraSelected}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose extensions"
            style={{ visibility: "hidden" }}
            className="fixed z-50 flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/55 p-4 shadow-[0_30px_80px_-20px_rgba(15,30,80,0.6)] backdrop-blur-2xl backdrop-saturate-150"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-slate-900">Extensions</span>
              <div className="flex gap-3 text-xs text-slate-600">
                <button type="button" onClick={() => onSetAll([...options])} className="hover:text-slate-900">
                  Select all
                </button>
                <button type="button" onClick={() => onSetAll([])} className="hover:text-slate-900">
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {options.map((tld) => {
                const isOn = selected.has(tld);
                return (
                  <button
                    key={tld}
                    type="button"
                    onClick={() => onToggle(tld)}
                    aria-pressed={isOn}
                    className={`flex flex-col items-start rounded-2xl border px-3 py-2 text-left transition ${
                      isOn
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-white/80 bg-white/70 text-slate-800 hover:border-slate-400"
                    }`}
                  >
                    <span className="text-sm">.{tld}</span>
                    <span className={`text-[11px] ${isOn ? "text-white/70" : "text-slate-500"}`}>
                      ~${PRICE_TABLE[tld]}/yr
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-600">
                {selected.size > 0 ? `${selected.size} selected` : "Pick at least one"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-gradient-to-b from-[#1b1a26] to-[#0b0b12] px-5 py-2 text-xs text-white transition hover:from-[#2a2840] hover:to-[#14131f]"
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Chip({ tld, isOn, onClick }: { tld: string; isOn: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isOn}
      className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
        isOn
          ? "border-white bg-white text-slate-800 shadow-sm"
          : "border-transparent bg-[#c9d3e6] text-slate-500 line-through decoration-slate-400 hover:text-slate-700"
      }`}
    >
      .{tld}
    </button>
  );
}
