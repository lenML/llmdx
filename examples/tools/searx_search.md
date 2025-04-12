---
type: tool
id: searx_search
difficulty: low

engine: v0-1

request: chat
temperature: 0.4
top_p: 0.75

tool_type: HTTP-GET
base_url: get.SEARXNG_SEARCH_BASE
url_path: /search

init:
  - key: user_query
    type: string
    required: true
  - key: history
    type: array
    default: []
  - key: categories
    type: array
    default: [
        "general",
        "videos",
        "social media",
        "images",
        # "music",
        # "packages",
        # "it",
        # "files",
        # "apps",
        # "software wikis",
        "science",
        # "scientific publications",
        "web",
        "news",
        # "repos",
        "other",
        "weather",
        # "map",
        # "dictionaries",
        # "shopping",
        # "lyrics",
        # "cargo",
        # "movies",
        # "translate",
        # "radio",
        "q&a",
        "wikimedia",
      ]
  - key: engines
    type: array
    default:
      [
        "arxiv",
        "wikipedia",
        "bing images",
        "bing news",
        "bing videos",
        "github",
        "google",
        "google images",
        "google videos",
        "youtube",
      ]
---

# Searx search

调用 searx search 引擎搜索

# Desc

Use this tool to perform web searches via the SearxNG metasearch engine. Accesses current, real-time, or external information by querying multiple online sources (like Google, Bing, Wikipedia, GitHub). Essential when your internal knowledge is insufficient or outdated, or when the user asks for a web search or specific online resource/URL.

# Init

```js
// TODO: 请求 /config 获取可用 categories 和 engines
```

# System Prompt

You are an AI assistant tasked with generating JSON payloads to call the `searx_search` tool. Analyze the user's request and the surrounding conversation context to determine the most effective parameters.

**Goal:** Create a precise JSON payload for the `searx_search` tool that accurately fulfills the user's search intent derived from the context.

**Tool:** `searx_search`

**Payload Parameters:**

1.  **`q` (string, Required):**

    - This is the core search query extracted and refined from the user's request and context.
    - **Crucially, embed SearXNG syntax (`!engine_name`, `site:domain.com`) directly within `q` whenever possible for efficient filtering.** Example: `"asyncio best practices !github site:python.org"`

2.  **Optional Parameters (Use _only_ if context explicitly requires filtering not achievable via `q` syntax):**
    - **`engines` (string):** Comma-separated list to _force_ specific search engines (e.g., `"google,wikipedia"`). Prefer `!engine` in `q`. Available: `{{ engines }}`
    - **`categories` (string):** Filter by result type (e.g., `"news,technology"`). Available: `{{ categories }}`
    - **`language` (string):** Specify language code (e.g., `"de"`, `"fr"`).
    - **`time_range` (string):** Limit results ("day", "month", "year").

**Instructions:**

1.  **Analyze Context:** Understand the user's specific search need from their message and the conversation history.
2.  **Formulate `q`:** Create the most effective query string. Integrate `!engine` or `site:` syntax directly into `q` if the context indicates specific sources or sites.
3.  **Add Optional Filters Sparingly:** Only include `engines`, `categories`, `language`, or `time_range` if the context explicitly demands these filters _and_ they cannot be handled effectively within the `q` string.
4.  **Output JSON:** Generate _only_ the valid JSON payload containing the selected parameters.

**Example:**

User Request (Context: User previously asked about German history): "Search Wikipedia for 'Albert Einstein' in German."

Correct Payload Generation Logic: Context implies German language and Wikipedia source. Best practice is embedding in `q`.

Recommended Payload:

```json
{
  "q": "Albert Einstein",
  "engines": "wikipedia",
  "language": "de",
  "format": "json"
}
```

# json schema

```json
{
  "name": "searx_search",
  "description": "searx search api calling",
  "schema": {
    "type": "object",
    "properties": {
      "q": {
        "type": "string",
        "description": "The search query. This string will be passed to external search services."
      },
      "categories": {
        "type": "string",
        "description": "Comma separated list specifying the active search categories."
      },
      "engines": {
        "type": "string",
        "description": "Comma separated list specifying the active search engines."
      },
      "language": {
        "type": "string",
        "description": "Code of the language for the search."
      },
      "page": {
        "type": "integer",
        "default": 1,
        "description": "Search page number."
      },
      "time_range": {
        "type": "string",
        "enum": ["day", "month", "year"],
        "description": "Time range of search for engines that support it."
      },
      "format": {
        "type": "string",
        "enum": ["json", "csv", "rss"],
        "description": "Output format of results."
      },
      "results_on_new_tab": {
        "type": "integer",
        "enum": [0, 1],
        "default": 0,
        "description": "Open search results on a new tab."
      },
      "image_proxy": {
        "type": "boolean",
        "default": true,
        "description": "Proxy image results through SearXNG."
      },
      "autocomplete": {
        "type": "string",
        "enum": [
          "google",
          "dbpedia",
          "duckduckgo",
          "mwmbl",
          "startpage",
          "wikipedia",
          "stract",
          "swisscows",
          "qwant"
        ],
        "description": "Service that completes words as you type."
      },
      "safesearch": {
        "type": "integer",
        "enum": [0, 1, 2],
        "description": "Filter search results based on safe search."
      },
      "theme": {
        "type": "string",
        "enum": ["simple"],
        "default": "simple",
        "description": "Theme of the instance."
      },
      "enabled_plugins": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "Hash_plugin",
            "Self_Information",
            "Tracker_URL_remover",
            "Ahmia_blacklist",
            "Hostnames_plugin",
            "Open_Access_DOI_rewrite",
            "Vim-like_hotkeys",
            "Tor_check_plugin"
          ]
        },
        "description": "List of enabled plugins."
      },
      "disabled_plugins": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "Hash_plugin",
            "Self_Information",
            "Tracker_URL_remover",
            "Ahmia_blacklist",
            "Hostnames_plugin",
            "Open_Access_DOI_rewrite",
            "Vim-like_hotkeys",
            "Tor_check_plugin"
          ]
        },
        "description": "List of disabled plugins."
      },
      "enabled_engines": {
        "type": "array",
        "items": {
          "type": "string",
          "description": "List of enabled engines."
        },
        "description": "List of enabled engines."
      },
      "disabled_engines": {
        "type": "array",
        "items": {
          "type": "string",
          "description": "List of disabled engines."
        },
        "description": "List of disabled engines."
      }
    },
    "required": ["q", "format"],
    "additionalProperties": false
  }
}
```

# Output

```js
output = output.results.map((x) => ({
  url: x.url,
  title: x.title,
  content: x.content || undefined,
  img: x.img_src || x.thumbnail || undefined,
  iframe: x.iframe_src || undefined,
}));
```

# Template

{% if history %}
[chat history]
{% for msg in history %}
{{ msg.role }}: {{ msg.content }}
{% endfor %}
{% endif %}

[user query]
{{ user_query }}
