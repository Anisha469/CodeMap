const axios = require("axios");

const askAI = async (question, context) => {
  const prompt = `
You are CodeMap, an AI codebase intelligence assistant.

Answer questions about a software repository using ONLY the repository
context provided below.

IMPORTANT RULES:

1. Do not invent files, code, functions, or functionality.
2. Use the provided repository files as evidence.
3. Always mention exact file paths when relevant.
4. Keep answers concise and practical.
5. If the context is insufficient, say:
   "The provided repository context is insufficient to answer this accurately."

Question:
${question}

Repository Context:
${context}

Now answer the question directly.
`;

  const models = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
  ];

  for (const model of models) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
        }
      );

      const answer =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (answer) {
        console.log(`Gemini response generated using ${model}`);
        return answer;
      }

    } catch (error) {
      console.error(
        `Gemini ${model} error:`,
        error.response?.data || error.message
      );

      const status = error.response?.status;

      // Try the next model only for temporary/unavailable model errors
      if (status !== 503 && status !== 429) {
        throw new Error("Failed to generate AI response");
      }
    }
  }

  throw new Error("All Gemini models are temporarily unavailable");
};

module.exports = {
  askAI,
};