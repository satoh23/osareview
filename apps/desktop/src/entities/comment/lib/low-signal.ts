const LOW_SIGNAL_PATTERNS = [
  /^w+$/i,
  /^草+$/,
  /^[!！?？]+$/,
  /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u,
];

export function isLowSignalText(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.length <= 2 || LOW_SIGNAL_PATTERNS.some((p) => p.test(trimmed))
  );
}
