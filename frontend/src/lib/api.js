export const resolveApiBase = (env, isDev = false) => {
  const raw = isDev ? "" : (env?.VITE_API_BASE || "");
  return raw.replace(/\/+$/, "");
};
