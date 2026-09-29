const axios = require("axios");

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

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
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
  ];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `Trying Gemini ${model} (attempt ${attempt})`
        );

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
            generationConfig: {
              temperature: 0.2,
            },
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
          console.log(
            `Gemini response generated using ${model}`
          );

          return answer;
        }

        throw new Error("Gemini returned an empty response");

      } catch (error) {
        const status = error.response?.status;

        console.error(
          `Gemini ${model} attempt ${attempt} failed:`,
          error.response?.data || error.message
        );

        // Retry temporary errors
        if (status === 503 || status === 429) {
          if (attempt === 1) {
            console.log(
              `Retrying ${model} after temporary error...`
            );

            await sleep(1500);
            continue;
          }

          // Move to the next model after retrying
          console.log(
            `${model} unavailable after retry. Trying next model...`
          );

          break;
        }

        // Authentication / invalid request / other permanent errors
        throw new Error(
          "Failed to generate AI response"
        );
      }
    }
  }

  throw new Error(
    "All Gemini models are temporarily unavailable. Please try again later."
  );
};

module.exports = {
  askAI,
};