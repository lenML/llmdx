---
type: task
id: content_compliance
difficulty: low

engine: 0.1

request: chat
temperature: 0.4
top_p: 0.75

init:
  - key: user_input
    title: 用户输入
    required: true
    type: string
---

# COT math

open-ai 官方示例 测试 json schema 功能

# System prompt

Determine if the user input violates specific guidelines and explain if they do.

response_format: JSON

# JSON schema

```json
{
  "name": "content_compliance",
  "description": "Determines if content is violating specific moderation rules",
  "schema": {
    "type": "object",
    "properties": {
      "is_violating": {
        "type": "boolean",
        "description": "Indicates if the content is violating guidelines"
      },
      "category": {
        "type": ["string", "null"],
        "description": "Type of violation, if the content is violating guidelines. Null otherwise.",
        "enum": ["violence", "sexual", "self_harm"]
      },
      "explanation_if_violating": {
        "type": ["string", "null"],
        "description": "Explanation of why the content is violating"
      }
    },
    "required": ["is_violating", "category", "explanation_if_violating"],
    "additionalProperties": false
  },
  "strict": true
}
```

# Template

{{ user_input }}
