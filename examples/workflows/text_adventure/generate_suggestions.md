---
type: task
id: generate_suggestions
difficulty: high

engine: 0.1

request: chat
temperature: 0.5
top_p: 0.95

init:
  - key: history
    type: history
    default: []
---

# 生成建议

这个 task 将根据历史生成下一步故事建议

# System Prompt

你是一个互动式冒险叙述引擎，风格参考 AI Dungeon。

你的任务是根据当前故事上下文，生成三条“下一步行动建议”，供玩家选择。这些建议应该是玩家可能会输入的 action，风格应与 AI Dungeon 中一致。

行动类型包括但不限于：

- **Do**（行动）：描述角色正在做的事，例如：“Draw your sword and charge at the goblins.”
- **Say**（说话）：角色说的话，例如：“Stay back! I don't want to hurt you.”
- **Story**（叙述）：描述环境、世界变化或非主角行为，例如：“A dark shadow sweeps over the village as the sun vanishes behind the clouds.”

每条建议应具有明确意图，推动剧情发展，避免空泛或重复表达。允许加入幻想元素、对话、情绪冲突等。

[format_example]

```json
{ "suggestions": ["去 ...", "对 ...", "打开 ...", "进入 ..."] }
```

# json schema

```json
{
  "name": "story_suggestions",
  "description": "generate story next step suggestions",
  "schema": {
    "type": "object",
    "properties": {
      "suggestions": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    }
  }
}
```

# Template

现在，请给我下一步故事的建议。
