// Ergonomic re-export of the shared design tokens for use inside the app.
// Most styling should go through Tailwind utilities (see app/globals.css,
// which mirrors these same values into `@theme`) — reach for this module
// only where a token drives something Tailwind can't express statically,
// e.g. picking a role badge's colors at render time.
import { tokens } from "@rubies/shared";

export const { colors, spacing, radius, fontSize, fontWeight, fontFamily, roleBadge } =
  tokens;
export { tokens };
