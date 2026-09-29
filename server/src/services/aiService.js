const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
    "gemini-3.6-flash",
    "gemini-3.5-flash",
  ];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `Trying Gemini ${model} (attempt ${attempt})`
        );

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        const answer = response.text;

        if (!answer) {
          throw new Error("Gemini returned an empty response");
        }

        console.log(
          `Gemini response generated successfully using ${model}`
        );

        return answer;

      } catch (error) {
        const status =
          error.status ||
          error.response?.status;

        console.error(
          `Gemini ${model} attempt ${attempt} failed:`,
          error.message
        );

        // Retry temporary server overload
        if (status === 503 || status === 429) {
          if (attempt === 1) {
            console.log(
              `Retrying ${model} in 2 seconds...`
            );

            await sleep(2000);
            continue;
          }

          console.log(
            `${model} unavailable. Trying next model...`
          );

          break;
        }

        throw error;
      }
    }
  }

  throw new Error(
    "All Gemini models are temporarily unavailable."
  );
};

module.exports = {
  askAI,
};