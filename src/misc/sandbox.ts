function remove_js_comments(code: string) {
  return (
    code
      // 移除多行注释
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // 移除单行注释
      .replace(/\/\/.*(?=[\n\r])/g, "")
  );
}

export function run_code_with(
  code: string,
  context: Record<string, any>,
  extra: Record<string, any> = {}
) {
  code = remove_js_comments(code);
  const keys = Object.keys(context);
  const values = Object.values(context);
  const extra_keys = Object.keys(extra);
  const extra_values = Object.values(extra);
  const warper_code = `${code};\nreturn {${keys.join(", ")}};`;
  const func = new Function(...keys, ...extra_keys, warper_code);
  return func(...values, ...extra_values);
}

export function run_getter_code(code: string, context: Record<string, any>) {
  code = remove_js_comments(code);
  const keys = Object.keys(context);
  const values = Object.values(context);
  const warper_code = `return (${code});`;
  const func = new Function(...keys, warper_code);
  return func(...values);
}
