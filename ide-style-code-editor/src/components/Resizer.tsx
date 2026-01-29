/**
 * Resizer.tsx - Draggable resize handle for panels
 *
 * Used between the sidebar/editor and editor/output panels
 * to allow users to resize those sections by dragging.
 *
 * Features:
 * - Horizontal (col-resize) and vertical (row-resize) modes
 * - Visual feedback on hover/drag (accent color line)
 * - Proper cursor changes during drag
 * - Disables text selection while dragging
 */

"use client";

import type React from "react";
import { useCallback, useEffect, useRef } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface ResizerProps {
  /** Direction of resize: horizontal (left-right) or vertical (up-down) */
  direction: "horizontal" | "vertical";
  /** Callback with the pixel delta of the mouse movement */
  onResize: (delta: number) => void;
  /** Optional callback when resize ends (mouse up) */
  onResizeEnd?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function Resizer({
  direction,
  onResize,
  onResizeEnd,
}: ResizerProps) {
  /** Whether the user is currently dragging */
  const isResizing = useRef(false);

  /** Last mouse position to calculate delta */
  const lastPos = useRef(0);

  /**
   * Start resize on mouse down.
   * Records the initial position and sets up drag state.
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;

      // Record starting position (X for horizontal, Y for vertical)
      lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;

      // Change cursor globally while dragging
      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";

      // Disable text selection during drag
      document.body.style.userSelect = "none";
    },
    [direction]
  );

  /**
   * Handle mouse move and mouse up events.
   * These are attached to document to work even if mouse leaves the element.
   */
  useEffect(() => {
    /**
     * Calculate delta and call onResize while dragging.
     */
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;

      const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = currentPos - lastPos.current;
      lastPos.current = currentPos;

      onResize(delta);
    };

    /**
     * Clean up drag state on mouse up.
     */
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;

        // Reset cursor
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        // Notify parent that resize is complete
        onResizeEnd?.();
      }
    };

    // Attach listeners to document for global tracking
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction, onResize, onResizeEnd]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        resizer shrink-0 z-10
        ${direction === "horizontal" ? "resizer-x" : "resizer-y"}
      `}
    />
  );
}
