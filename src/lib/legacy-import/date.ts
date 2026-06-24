/** Parse legacy date text like `2024年8月31日` → ISO UTC midnight. */
export function parseLegacyDate(text: string): string | null {
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Date.UTC(+y!, +mo! - 1, +d!)).toISOString();
}
