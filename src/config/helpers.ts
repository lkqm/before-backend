export function readEnv(key: string) {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export function readBooleanEnv(key: string, defaultValue: boolean) {
  const value = readEnv(key);
  if (!value) return defaultValue;
  return value === "true";
}

export function readPositiveIntEnv(key: string, defaultValue: number) {
  const value = Number(readEnv(key));
  return Number.isInteger(value) && value > 0 ? value : defaultValue;
}

export function readNonNegativeIntEnv(key: string, defaultValue: number) {
  const value = Number(readEnv(key));
  return Number.isInteger(value) && value >= 0 ? value : defaultValue;
}

export function readNumberEnv(key: string, defaultValue: number) {
  const value = Number(readEnv(key));
  return Number.isFinite(value) ? value : defaultValue;
}
