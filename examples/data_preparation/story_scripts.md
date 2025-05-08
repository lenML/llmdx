---
type: task
id: story_scripts
difficulty: middle

engine: 0.1

request: chat
temperature: 0.4
top_p: 0.75

init:
  - key: user_input
    title: 用户输入
    required: true
    type: string
    desc: 需要处理的小说文本
---

# story Scripts

此任务为将输入的 小说文本 标注为类似剧本的脚本数据

# System Prompt

从用户输入中提取符合以下 TypeScript 类型的结构化对话数据，仅保留对话内容，忽略所有非对话文本。根据上下文判断角色名称，输出结果必须严格匹配类型定义。

```ts
type ScriptRow = {
  /**
   * 发言角色或者旁白，基于上下文推断
   *
   * role="narrator" 表示旁白
   */
  role: string;
  // 对应内容
  content: string;
};
type Result = {
  scripts: Array<ScriptRow>;
};
```

输出格式：

- 使用 JSON 格式输出
- 字段顺序必须与类型一致
- 字符串之间使用英文竖线（|）作为字段分隔符（仅限需要在一行展示时）
- 不得添加类型外的字段或注释说明
- 不允许输出任何额外说明、标识或格式包装，仅返回 JSON

示例输入：

```
村民中走出一个二十来岁的人汉，说道：“张先生，你可是从北方来吗”

张十五见他身材魁梧，浓眉大眼，便道：“正是。”那大汉道：“小弟作东，请先生去饮上三杯如何”张十五大喜，说道：“素不相识，怎敢叨扰”

那大汉笑道：“喝上三怀，那便相识了。我姓郭，名叫郭啸天。”
```

示例输出：

```json
{
  "scripts": [
    { "role": "narrator", "content": "村民中走出一个二十来岁的人汉" },
    { "role": "郭啸天", "content": "张先生，你可是从北方来吗" },
    { "role": "narrator", "content": "张十五见他身材魁梧，浓眉大眼" },
    { "role": "张十五", "content": "正是。" },
    { "role": "郭啸天", "content": "小弟作东，请先生去饮上三杯如何" },
    { "role": "narrator", "content": "张十五大喜" },
    { "role": "张十五", "content": "素不相识，怎敢叨扰" },
    {
      "role": "郭啸天",
      "content": "喝上三怀，那便相识了。我姓郭，名叫郭啸天。"
    }
  ]
}
```

# JSON schema

```json
{
  "name": "story_scripts",
  "description": "文章的剧情脚本",
  "schema": {
    "type": "object",
    "properties": {
      "scripts": {
        "type": "array",
        "description": "脚本列",
        "items": {
          "type": "object",
          "properties": {
            "role": {
              "type": "string"
            },
            "content": {
              "type": "string"
            },
            "required": ["role", "content"],
            "additionalProperties": false
          }
        }
      }
    },
    "required": ["scripts"],
    "additionalProperties": false
  },
  "strict": true
}
```

# Template

开始处理以下文本：

```
{{user_input}}
```

现在，请根据要求提取符合格式的数据。
