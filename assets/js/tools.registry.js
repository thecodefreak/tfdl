window.TOOLS_REGISTRY = {
  categories: [
    { id: "dev", label: "Dev" },
    { id: "productivity", label: "Productivity" },
    { id: "utilities", label: "Utilities" },
    { id: "finance", label: "Finance" },
    { id: "media", label: "Media" },
    { id: "writing", label: "Writing" }
  ],
  tools: [
    {
      id: "json-formatter",
      slug: "json-formatter",
      alias: "json",
      name: "JSON Formatter",
      category: "dev",
      description: "Pretty print, validate, and compact JSON payloads while testing APIs.",
      tags: ["json", "api", "format", "debug"]
    },
    {
      id: "regex-playground",
      slug: "regex-playground",
      alias: "regex",
      name: "Regex Playground",
      category: "dev",
      description: "Test patterns quickly with sample text and match highlighting.",
      tags: ["regex", "text", "pattern", "debug"]
    },
    {
      id: "url-encoder",
      slug: "url-encoder",
      alias: "url",
      name: "URL Encoder & Decoder",
      category: "dev",
      description: "Encode query strings or decode escaped text while debugging links.",
      tags: ["url", "encode", "decode", "query"]
    },
    {
      id: "focus-timer",
      slug: "focus-timer",
      alias: "focus",
      name: "Focus Timer",
      category: "productivity",
      description: "Run short work sprints without switching to a separate timer site.",
      tags: ["focus", "timer", "pomodoro", "work"]
    },
    {
      id: "notes-scratchpad",
      slug: "notes-scratchpad",
      alias: "notes",
      name: "Notes Scratchpad",
      category: "productivity",
      description: "Capture quick notes, snippets, and temporary text in one place.",
      tags: ["notes", "scratch", "text", "capture"]
    },
    {
      id: "unit-converter",
      slug: "unit-converter",
      alias: "units",
      name: "Unit Converter",
      category: "utilities",
      description: "Convert common measurements (length, weight, temperature) quickly.",
      tags: ["units", "convert", "measurement", "temperature"]
    },
    {
      id: "password-generator",
      slug: "password-generator",
      alias: "pass",
      name: "Password Generator",
      category: "utilities",
      description: "Create strong random passwords or passphrases locally.",
      tags: ["password", "security", "random", "passphrase"]
    },
    {
      id: "budget-snapshot",
      slug: "budget-snapshot",
      alias: "budget",
      name: "Budget Snapshot",
      category: "finance",
      description: "Track quick income and expense totals to estimate remaining budget.",
      tags: ["budget", "finance", "money", "expenses"]
    },
    {
      id: "color-palette",
      slug: "color-palette",
      alias: "colors",
      name: "Color Palette Builder",
      category: "media",
      description: "Generate and compare color sets for UI, branding, or content work.",
      tags: ["color", "palette", "design", "hex"]
    },
    {
      id: "image-markup",
      slug: "image-markup",
      alias: "img",
      name: "Image Markup",
      category: "media",
      description: "Highlight strokes plus blur/pixelate/blackout boxes for screenshots and images.",
      tags: ["image", "highlight", "blur", "pixelate", "redact", "screenshot"]
    },
    {
      id: "word-counter",
      slug: "word-counter",
      alias: "words",
      name: "Word Counter",
      category: "writing",
      description: "Count words, characters, and estimated reading time for drafts.",
      tags: ["words", "writing", "text", "count"]
    }
  ]
};
