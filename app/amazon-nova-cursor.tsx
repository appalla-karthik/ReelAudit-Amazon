"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, textarea, summary, label[for]';

export function AmazonNovaCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const supportsFancyCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (!supportsFancyCursor) {
      return;
    }

    const cursorNode = cursorRef.current;

    if (!cursorNode) {
      return;
    }

    const syncInteractiveState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest(INTERACTIVE_SELECTOR) : null;
      cursorNode.dataset.interactive = element ? "true" : "false";
    };

    const onMouseMove = (event: MouseEvent) => {
      cursorNode.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursorNode.dataset.visible = "true";
      syncInteractiveState(event.target);
    };

    const onMouseDown = () => {
      cursorNode.dataset.pressed = "true";
    };

    const onMouseUp = () => {
      cursorNode.dataset.pressed = "false";
    };

    const onMouseLeave = () => {
      cursorNode.dataset.visible = "false";
    };

    const onMouseOver = (event: MouseEvent) => {
      syncInteractiveState(event.target);
    };

    document.body.classList.add("nova-cursor-enabled");
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      document.body.classList.remove("nova-cursor-enabled");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="nova-cursor"
      data-interactive="false"
      data-pressed="false"
      data-visible="false"
    >
      <div className="nova-cursor__aura" />
      <div className="nova-cursor__audit">
        <span className="nova-cursor__audit-bracket nova-cursor__audit-bracket--tl" />
        <span className="nova-cursor__audit-bracket nova-cursor__audit-bracket--tr" />
        <span className="nova-cursor__audit-bracket nova-cursor__audit-bracket--bl" />
        <span className="nova-cursor__audit-bracket nova-cursor__audit-bracket--br" />
        <span className="nova-cursor__audit-pen">
          <span className="nova-cursor__audit-pen-tip" />
          <span className="nova-cursor__audit-pen-body" />
        </span>
      </div>
      <div className="nova-cursor__label">Audit</div>
    </div>
  );
}
