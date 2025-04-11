---
type: workflow
id: simple_text_adventure
start_node: Initialize

engine: v0-1

init:
  - key: player_input
    type: string
    default: ""
  - key: history
    type: object
    default: []
  - key: show_history
    type: boolean
    default: false
  - key: current_story
    type: string
    default: ""
  - key: story_thinking
    type: string
    default: ""
  - key: next_suggestions
    type: object
    default: []
  - key: initial_scenario
    type: string
    default: ""
---

# 文本冒险
一个基础的文本冒险工作流
> display用于基础可视化ui比如playground或者终端中

# Workflow

## Initialize
- execute: `set("player_input", initial_scenario)`
- goto: GenerateTurn

## GenerateTurn
- task: `generate_story`
  - params:
    - history: history
    - player_input: player_input
  - watch:
    ```js
    // 监听更新状态
    const { think, response } = progress;
    set("current_story", response);
    set("story_thinking", think);
    ```
- execute:
  ```js
  // 解析 task 执行结果并调整当前的 workflow states
  const { think, response } = outputs;
  set("current_story", response);
  set("story_thinking", think);
  append("history", {role: "assistant", response});
  ```
- task: `generate_suggestions`
  - params:
    - history: history
- execute:
  ```js
  // 解析出 suggestions
  const { suggestions } = outputs;
  set("next_suggestions", suggestions);
  ```
- goto: GetInput

## GetInput
- form:
  - input:
    - desc: 你的下一步想法
    - type: string
  - choice:
    - desc: 选择建议
    - type: enum
    - enum: suggestions
- execute:
  ```js
  const { input, choice } = outputs;
  set("player_input", choice || input);
  ```
- goto: GenerateTurn

# Display
👋 这里是文字冒险游戏，你可以选择你的下一步动作。
---
{{ history_block }}
[+](@toggle("show_history"))

{{ current_story }}

next:
{{ choices_block }}

## history_block
{% if show_history %}
{% for msg in history %}
{{ msg.role }}: {{ msg.content }}
{% endfor %}
{% endif %}

## choices_block
{% for choice in choices %}
[{{ choice }}](@set("player_input",choice))
{% endfor %}
