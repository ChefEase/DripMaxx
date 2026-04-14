const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : false;

export const logInfo = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args);
  }
};

export const logWarn = (...args: unknown[]) => {
  console.warn(...args);
};

export const logError = (...args: unknown[]) => {
  console.error(...args);
};
