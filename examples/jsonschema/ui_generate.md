---
type: task
id: ui_generate
difficulty: high

engine: v0-1

request: chat
temperature: 0.4
top_p: 0.75

init:
- key: user_input
  title: UI描述
  required: true
  type: string
  desc: 你需要什么样的UI
---

# UI Generate
open-ai 官方示例 测试 json schema 功能

注意：
此task依赖服务端支持嵌套jsonschema定义，几乎只有openai自己实现了嵌套jsonschema，比如 llama.cpp / llm-studio 都是不支持这个功能的。

# System Prompt
You are a UI generator AI. Convert the user input into a UI.

response example:
```json
{"type":"form","label":"Example Form","children":[{"type":"field","label":"Username","children":[],"attributes":[{"name":"type","value":"text"},{"name":"placeholder","value":"Enter username"}]},{"type":"field","label":"Password","children":[],"attributes":[{"name":"type","value":"password"},{"name":"placeholder","value":"Enter password"}]},{"type":"button","label":"Login","children":[],"attributes":[{"name":"onClick","value":"handleLogin()"},{"name":"className","value":"btn btn-primary"}]}],"attributes":[]}
```

# json schema
```json
{
  "name": "ui",
  "description": "Dynamically generated UI",
  "schema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "description": "The type of the UI component",
        "enum": ["div", "button", "header", "section", "field", "form"]
      },
      "label": {
        "type": "string",
        "description": "The label of the UI component, used for buttons or form fields"
      },
      "children": {
        "type": "array",
        "description": "Nested UI components",
        "items": { "$ref": "#" }
      },
      "attributes": {
        "type": "array",
        "description": "Arbitrary attributes for the UI component, suitable for any element",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "The name of the attribute, for example onClick or className"
            },
            "value": {
              "type": "string",
              "description": "The value of the attribute"
            }
          },
          "required": ["name", "value"],
          "additionalProperties": false
        }
      }
    },
    "required": ["type", "label", "children", "attributes"],
    "additionalProperties": false
  },
  "strict": true
}
```

# Template
{{ user_input }}
