/**
 * 移除对象上的所有空内容，包括 null 空字符 空数组，以减少 token
 */
export function minifyJson(obj: any) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(minifyJson).filter((x) => x !== null);
  }

  const result: any = {};
  for (const key in obj) {
    const value = minifyJson(obj[key]);
    if (
      value !== null &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0)
    ) {
      result[key] = value;
    }
  }

  return result;
}
