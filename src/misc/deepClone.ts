export const deepClone = <T>(o: T): T =>
  !!globalThis.structuredClone
    ? structuredClone(o)
    : JSON.parse(JSON.stringify(o));
