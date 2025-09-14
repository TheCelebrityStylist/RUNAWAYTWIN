export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for recent info, trends, price, or stock clues.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          num:   { type: "number", default: 5 }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_url_extract",
      description: "Fetch a URL and extract readable text (title, text, canonical).",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "catalog_search",
      description: "Search product catalogs (affiliate-safe) with filters.",
      parameters: {
        type: "object",
        properties: {
          query:   { type: "string" },
          region:  { type: "string", enum: ["EU","US"] },
          budget:  { type: "string", enum: ["high-street","mid","luxury"] },
          sizes:   { type: "object", additionalProperties: true },
          limit:   { type: "number", default: 12 }
        },
        required: ["query"]
      }
    }
  }
];
