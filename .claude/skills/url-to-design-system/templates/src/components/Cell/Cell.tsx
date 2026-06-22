import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import "./Cell.css";

export interface CellProps {
  children?: ReactNode;
  /** Size in px. Defaults to the module token. */
  size?: number;
  /** Render hover/active affordances. */
  interactive?: boolean;
  /** Persistent selected state. */
  active?: boolean;
  /** Muted/disabled appearance. */
  muted?: boolean;
  /** Polymorphic tag — "div" (default), "a", "button", "li"… */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  // Pass-throughs (href, onClick, aria-*, type…)
  [key: string]: unknown;
}

/**
 * Cell — TEMPLATE PRIMITIVE. Rename to the source's actual atomic unit and
 * adapt. The whole component set should compose from one (or a few) of these.
 *
 * Demonstrates the three patterns every component in this DS follows:
 *  1. Polymorphic `as` so the same visual can be a div / link / button.
 *  2. CSS-variable overrides for per-instance tokens (size here).
 *  3. The TS2698-safe style merge: `{ ...(style ?? {}) }` then index-assign
 *     CSS vars via a Record<string,string> cast (a bare `...style` on an
 *     optional prop fails `tsc` in this config).
 */
export const Cell = forwardRef<HTMLElement, CellProps>(function Cell(
  {
    children,
    size,
    interactive = false,
    active = false,
    muted = false,
    as,
    className = "",
    style,
    ...rest
  },
  ref
) {
  const Tag = (as ?? "div") as ElementType;
  const classes = [
    "__NS__-cell",
    interactive && "__NS__-cell--interactive",
    active && "__NS__-cell--active",
    muted && "__NS__-cell--muted",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const mergedStyle = { ...(style ?? {}) } as CSSProperties & Record<string, string>;
  if (size != null) mergedStyle["--__NS__-cell-size"] = `${size}px`;

  return (
    <Tag ref={ref} className={classes} style={mergedStyle} {...rest}>
      {children}
    </Tag>
  );
});
