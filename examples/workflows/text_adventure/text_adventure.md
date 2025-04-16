---
type: workflow
id: simple_text_adventure
start_node: Initialize

engine: 0.1

init:
  - key: player_input
    type: string
    default: ""
  - key: history
    type: history
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

> display 用于基础可视化 ui 比如 playground 或者终端中

# Workflow

## Initialize

- execute: `player_input = initial_scenario`
- goto: GenerateTurn

## GenerateTurn

- execute:
  ```js
  // 清理上下文
  current_story = "generating...";
  next_suggestions = [];
  ```
- task: `generate_story`
  - inputs:
    - history: history
    - player_input: player_input
  - watch:
    ```js
    // 监听更新状态
    const { think, response } = progress;
    current_story = response;
    story_thinking = think;
    ```
- execute:
  ```js
  // 解析 task 执行结果并调整当前的 workflow states
  const { think, response } = outputs;
  current_story = response;
  story_thinking = think;
  history.push({ role: "user", content: player_input });
  history.push({ role: "assistant", content: response });
  console.log("assistant>", response);
  ```
- task: `generate_suggestions`
  - inputs:
    - history: history
- execute:
  ```js
  // 解析出 suggestions
  next_suggestions = outputs.suggestions;
  console.log("assistant>", next_suggestions);
  ```
- goto: GetInput

## GetInput

- form:
  - player_input:
    - desc: 你的下一步想法
    - type: string
    - enum: next_suggestions
- execute:
  ```js
  player_input = outputs.player_input;
  ```
- goto: GenerateTurn
