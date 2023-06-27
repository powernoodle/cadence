export function makeColor(
  color: string,
  lightShade: number,
  darkShade: number,
  scheme: "light" | "dark"
) {
  return `${color}.${scheme === "light" ? lightShade : darkShade}`;
}
