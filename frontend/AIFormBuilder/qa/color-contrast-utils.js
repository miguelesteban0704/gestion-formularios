const COLOR_TOKENS = [
  ["appBg", "app-bg"],
  ["surface", "surface"],
  ["surface2", "surface-2"],
  ["fg", "fg"],
  ["fgMuted", "fg-muted"],
];

function rgbChannels(color) {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) throw new TypeError(`Expected a six-digit hex color, received ${color}`);
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16));
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color) {
  const [red, green, blue] = rgbChannels(color).map(linearize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function compositeOver(foreground, background, alpha) {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError("alpha must be between 0 and 1");
  }

  const foregroundChannels = rgbChannels(foreground);
  const backgroundChannels = rgbChannels(background);
  return `#${foregroundChannels
    .map((channel, index) => Math.round(channel * alpha + backgroundChannels[index] * (1 - alpha)))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function ruleBodies(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`(?:^|})\\s*${escapedSelector}\\s*\\{([^{}]*)\\}`, "gm");
  return [...css.matchAll(rule)].map((match) => match[1]);
}

function themeTokens(css, selector) {
  const source = ruleBodies(css, selector).find((body) => /--(?:app-bg|surface|surface-2|fg|fg-muted)\s*:/.test(body));
  if (!source) throw new Error(`Missing semantic token rule for ${selector}`);

  const tokens = {};
  for (const [property, name] of COLOR_TOKENS) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const declaration = new RegExp(`(?:^|\\s)--${escapedName}\\s*:\\s*(#[0-9a-f]{6})\\s*;`, "i").exec(source);
    if (!declaration) throw new Error(`Missing or unsupported --${name} in ${selector}; expected a six-digit hex color`);
    tokens[property] = declaration[1].toLowerCase();
  }
  return tokens;
}

export function parseThemeTokens(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return {
    light: themeTokens(withoutComments, ":root"),
    dark: themeTokens(withoutComments, ".dark"),
  };
}
