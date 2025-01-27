/*
Uses the OpenRouter API to generate a response to a given prompt. Below is the example for the Deepseek R1 model.
fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer <OPENROUTER_API_KEY>",
    "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "<YOUR_SITE_NAME>", // Optional. Site title for rankings on openrouter.ai.
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "model": "deepseek/deepseek-r1",
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  })
});

Main strategy here:
- Pass in the user prompt to the OpenRouter API if its selected as the strategy to use
- Filter out the <answer></answer> tags from the response to only show the thinking process
- Return the response as a string and pass that back into claude for advanced reasoning


Possible tool schema:
{
  "name": "r1-sonnet",
  "description": "Use deepseek/deepseek-r1 to think about the given topic.",
  "args": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "what the user's prompt was/is"
      }
    },
    "required": ["prompt"]
  }
}

*/
