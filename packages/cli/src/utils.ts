export const parseBoolOption = (arg?: unknown, defaultVal = false): boolean => {
  try {
    if (!arg) return defaultVal;
    const parsed = JSON.parse(String(arg).toLowerCase());
    return typeof parsed === "boolean" ? parsed : defaultVal;
  } catch {
    return defaultVal;
  }
};

export const parseRestoreArg = (arg: unknown): number => {
  try {
    if (typeof arg === "boolean") {
      return 0;
    }
    const num = Number(arg);
    return Number.isNaN(num) ? 0 : Math.abs(Math.floor(num));
  } catch {
    return 0;
  }
};
