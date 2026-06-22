// __PKG__ — public entry.
// Importing this module also pulls in the compiled tokens + fonts so the
// design system is self-contained for consumers.
import "./styles/fonts.css";
import "./styles/tokens.css";

// One export pair per component. Keep types alongside the component.
export { Cell } from "./components/Cell/Cell";
export type { CellProps } from "./components/Cell/Cell";
// export { ... } from "./components/.../...";
