/**
 * "Chrome on Windows" from a browser's User-Agent, for the signed-in devices list.
 * A rough, readable guess: the list helps a person recognise their own devices, and
 * nothing is decided from it. Order matters: Edge and Opera also say "Chrome", and
 * Chrome also says "Safari".
 */
const browsers: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const systems: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

const find = (list: [RegExp, string][], text: string) =>
  list.find(([pattern]) => pattern.test(text))?.[1];

export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown browser";
  const browser = find(browsers, userAgent);
  const system = find(systems, userAgent);
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? "Unknown browser";
}
