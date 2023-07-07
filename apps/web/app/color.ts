export function makeColor(
  color: string,
  lightShade: number,
  darkShade: number,
  scheme: "light" | "dark"
) {
  if (color === "violet" && scheme === "dark") Math.max((darkShade -= 1), 0);
  return `${color}.${scheme === "light" ? lightShade : darkShade}`;
}
