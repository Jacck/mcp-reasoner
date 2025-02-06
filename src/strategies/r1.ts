/*
Uses the Groq API to generate responses with chain-of-thought reasoning.

Main strategy:
1. Initial reasoning using deepseek-r1-distill-llama-70b
2. Critical analysis using llama-3.3-70b-versatile
3. Refinement based on critique
4. Return refined reasoning to Claude

The process enables:
- Multi-step reasoning
- Self-critique and improvement
- Structured thought processes
- Enhanced problem-solving capabilities

Tool schema remains the same but uses Groq's API internally.
*/
