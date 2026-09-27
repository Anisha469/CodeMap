const Repository = require("../models/Repository");

const STOP_WORDS = new Set([
  "what",
  "does",
  "this",
  "the",
  "a",
  "an",
  "is",
  "are",
  "of",
  "to",
  "in",
  "on",
  "for",
  "how",
  "where",
  "which",
  "can",
  "you",
  "me",
  "tell",
  "about",
  "please",
  "show",
  "give",
  "explain",
]);

const searchRepository = async (repositoryId, query) => {
  const repository = await Repository.findById(repositoryId);

  if (!repository) {
    throw new Error("Repository not found");
  }

  const lowerQuery = query.toLowerCase().trim();

  const searchTerms = lowerQuery
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !STOP_WORDS.has(word)
    );

  if (searchTerms.length === 0) {
    return [];
  }

  // --------------------------------
  // Question type detection
  // --------------------------------

  const entryPointQuestion =
    lowerQuery.includes("entry point") ||
    lowerQuery.includes("main application") ||
    lowerQuery.includes("main file") ||
    lowerQuery.includes("start the application") ||
    lowerQuery.includes("starting point");

  const repositoryQuestion =
    lowerQuery.includes("repository") ||
    lowerQuery.includes("project") ||
    lowerQuery.includes("purpose") ||
    lowerQuery.includes("what is this") ||
    lowerQuery.includes("what does this") ||
    lowerQuery.includes("what does the project") ||
    lowerQuery.includes("what does the repository") ||
    lowerQuery.includes("about this project") ||
    lowerQuery.includes("about this repository");

  const applicationCreationQuestion =
    lowerQuery.includes("application created") ||
    lowerQuery.includes("create application") ||
    lowerQuery.includes("creates the application") ||
    lowerQuery.includes("where is the application") ||
    lowerQuery.includes("application initialized") ||
    lowerQuery.includes("initialize the application");

  const requestFlowQuestion =
    lowerQuery.includes("incoming http requests") ||
    lowerQuery.includes("incoming requests") ||
    lowerQuery.includes("handle http requests") ||
    lowerQuery.includes("handle incoming requests") ||
    lowerQuery.includes("request flow") ||
    lowerQuery.includes("how are requests handled") ||
    lowerQuery.includes(
      "how does the application handle requests"
    ) ||
    lowerQuery.includes(
      "how does this repository handle requests"
    );

  const architectureQuestion =
    lowerQuery.includes("architecture") ||
    lowerQuery.includes("structure") ||
    lowerQuery.includes("organized") ||
    lowerQuery.includes("folder") ||
    lowerQuery.includes("folders");

  // --------------------------------
  // Search repository files
  // --------------------------------

  const results = repository.files
    .map((file) => {
      const path = file.path.toLowerCase();
      const content = file.content.toLowerCase();

      const fileName =
        path.split("/").pop();

      let score = 0;

      // --------------------------------
      // File classification
      // --------------------------------

      const isTestFile =
        path.includes("test/") ||
        path.includes("tests/") ||
        path.startsWith("test") ||
        path.startsWith("tests");

      const isExampleFile =
        path.includes("examples/") ||
        path.startsWith("examples");

      const isDocumentationFile =
        path.includes("changelog") ||
        path.includes("history") ||
        path.includes("changes");

      const isReadme =
        path === "readme" ||
        path.startsWith("readme.");

      const isSourceFile =
        path.startsWith("lib/") ||
        path.startsWith("src/") ||
        path.startsWith("server/") ||
        path.startsWith("app/");

      // --------------------------------
      // Request-flow relevant files
      // --------------------------------
      //
      // These are the kinds of files we want
      // for a request-flow explanation.
      //
      const isRequestFlowFile =
        path.includes("application") ||
        path.includes("request") ||
        path.includes("response") ||
        path.includes("router") ||
        path.includes("middleware") ||
        path.includes("server") ||
        path.includes("app.js") ||
        path.includes("app.ts") ||
        path.endsWith("express.js");

      // --------------------------------
      // 1. File path matching
      // --------------------------------

      searchTerms.forEach((term) => {
        if (path.includes(term)) {
          score += 8;
        }
      });

      // --------------------------------
      // 2. File name matching
      // --------------------------------

      searchTerms.forEach((term) => {
        if (fileName.includes(term)) {
          score += 10;
        }
      });

      // --------------------------------
      // 3. Content matching
      // --------------------------------

      searchTerms.forEach((term) => {
        if (content.includes(term)) {
          score += 1;
        }
      });

      // --------------------------------
      // 4. General source preference
      // --------------------------------

      if (isSourceFile) {
        score += 2;
      }

      if (isTestFile) {
        score -= 5;
      }

      if (isExampleFile) {
        score -= 10;
      }

      if (isDocumentationFile) {
        score -= 5;
      }

      // --------------------------------
      // 5. Entry-point questions
      // --------------------------------

      if (entryPointQuestion) {
        if (
          path === "package.json" ||
          path.endsWith("/package.json")
        ) {
          score += 15;
        }

        if (
          path === "index.js" ||
          path === "index.ts" ||
          path === "server.js" ||
          path === "server.ts" ||
          path === "app.js" ||
          path === "app.ts"
        ) {
          score += 12;
        }

        if (
          path.includes("/index.js") ||
          path.includes("/index.ts") ||
          path.includes("/server.js") ||
          path.includes("/server.ts") ||
          path.includes("/app.js") ||
          path.includes("/app.ts")
        ) {
          score += 5;
        }

        if (isExampleFile) {
          score -= 15;
        }

        if (isTestFile) {
          score -= 10;
        }

        if (isDocumentationFile) {
          score -= 10;
        }
      }

      // --------------------------------
      // 6. Repository-level questions
      // --------------------------------

      if (repositoryQuestion) {
        if (isReadme) {
          score += 30;
        }

        if (
          path === "package.json" ||
          path.endsWith("/package.json")
        ) {
          score += 20;
        }

        if (
          path === "index.js" ||
          path === "index.ts" ||
          path === "server.js" ||
          path === "server.ts" ||
          path === "app.js" ||
          path === "app.ts"
        ) {
          score += 10;
        }

        if (isTestFile) {
          score -= 15;
        }

        if (isExampleFile) {
          score -= 15;
        }

        if (isDocumentationFile) {
          score -= 10;
        }
      }

      // --------------------------------
      // 7. Application creation
      // --------------------------------

      if (applicationCreationQuestion) {
        if (
          path === "lib/express.js" ||
          path.endsWith("/lib/express.js")
        ) {
          score += 30;
        }

        if (
          path === "lib/application.js" ||
          path.endsWith("/lib/application.js")
        ) {
          score += 5;
        }

        if (isTestFile || isExampleFile) {
          score -= 20;
        }
      }

      // --------------------------------
      // 8. Request-flow questions
      // --------------------------------

      if (requestFlowQuestion) {
        // IMPORTANT:
        // Do not allow unrelated source files
        // into the RAG context.

        if (!isRequestFlowFile) {
          return null;
        }

        // Never use these as evidence for
        // internal request flow.
        if (isReadme) {
          return null;
        }

        if (isTestFile) {
          return null;
        }

        if (isExampleFile) {
          return null;
        }

        // --------------------------------
        // Strong relevance scores
        // --------------------------------

        if (
          path === "lib/application.js" ||
          path.endsWith("/lib/application.js")
        ) {
          score += 35;
        }

        if (
          path === "lib/request.js" ||
          path.endsWith("/lib/request.js")
        ) {
          score += 30;
        }

        if (
          path === "lib/response.js" ||
          path.endsWith("/lib/response.js")
        ) {
          score += 25;
        }

        if (
          path.includes("/router/") ||
          path === "router.js" ||
          path.endsWith("/router.js")
        ) {
          score += 25;
        }

        if (
          path.includes("middleware")
        ) {
          score += 20;
        }

        if (
          path === "lib/express.js" ||
          path.endsWith("/lib/express.js")
        ) {
          score += 15;
        }

        if (
          path === "server.js" ||
          path.endsWith("/server.js")
        ) {
          score += 15;
        }
      }

      // --------------------------------
      // 9. Architecture questions
      // --------------------------------

      if (architectureQuestion) {
        if (
          path.startsWith("lib/") ||
          path.startsWith("src/")
        ) {
          score += 4;
        }

        if (
          path === "package.json" ||
          path.endsWith("/package.json")
        ) {
          score += 5;
        }
      }

      // --------------------------------
      // Ignore zero-score files
      // --------------------------------

      if (score <= 0) {
        return null;
      }

      return {
        path: file.path,
        content: file.content,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  // --------------------------------
  // Debug logs
  // --------------------------------

  console.log(
    "Search query:",
    query
  );

  console.log(
    "Search terms:",
    searchTerms
  );

  console.log(
    "Question type:",
    {
      entryPointQuestion,
      repositoryQuestion,
      applicationCreationQuestion,
      requestFlowQuestion,
      architectureQuestion,
    }
  );

  console.log(
    "Search results:",
    results.slice(0, 10).map(
      (result) => ({
        path: result.path,
        score: result.score,
      })
    )
  );

  return results.slice(0, 8);
};

module.exports = {
  searchRepository,
};