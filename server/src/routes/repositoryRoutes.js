const express = require("express");

const Repository = require("../models/Repository");

const {
  searchRepository,
} = require("../services/searchService");

const {
  askAI,
} = require("../services/aiService");

const {
  getArchitecture,
} = require("../services/architectureService");

const {
  parseGitHubUrl,
  getRepository,
  getRepositoryTree,
  filterRepositoryTree,
  getFileContent,
} = require("../services/githubService");

const router = express.Router();


// ========================================
// Helper: Detect question type
// ========================================

const isRequestFlowQuestion = (question) => {
  const query = question.toLowerCase();

  return (
    query.includes("incoming http requests") ||
    query.includes("incoming requests") ||
    query.includes("handle http requests") ||
    query.includes("handle incoming requests") ||
    query.includes("request flow") ||
    query.includes("how are requests handled") ||
    query.includes(
      "how does the application handle requests"
    ) ||
    query.includes(
      "how does this repository handle requests"
    )
  );
};


// ========================================
// Helper: Extract relevant code sections
// ========================================

const extractRelevantContext = (
  content,
  keywords,
  maxCharacters = 5000
) => {
  const lines = content.split("\n");

  const matchingIndexes = [];

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();

    const matches = keywords.some((keyword) =>
      lowerLine.includes(keyword)
    );

    if (matches) {
      matchingIndexes.push(index);
    }
  });

  // If nothing matched, return the beginning
  // of the file as fallback context.
  if (matchingIndexes.length === 0) {
    return lines
      .slice(0, 80)
      .join("\n")
      .slice(0, maxCharacters);
  }

  const selectedRanges = [];

  matchingIndexes.forEach((index) => {
    const start = Math.max(
      0,
      index - 8
    );

    const end = Math.min(
      lines.length,
      index + 15
    );

    selectedRanges.push({
      start,
      end,
    });
  });

  // Merge overlapping ranges
  selectedRanges.sort(
    (a, b) => a.start - b.start
  );

  const mergedRanges = [];

  selectedRanges.forEach((range) => {
    const last =
      mergedRanges[
        mergedRanges.length - 1
      ];

    if (
      last &&
      range.start <= last.end
    ) {
      last.end = Math.max(
        last.end,
        range.end
      );
    } else {
      mergedRanges.push({
        ...range,
      });
    }
  });

  let result = "";

  for (const range of mergedRanges) {
    const section = lines
      .slice(range.start, range.end)
      .map(
        (line, offset) =>
          `${range.start + offset + 1}: ${line}`
      )
      .join("\n");

    if (
      result.length + section.length >
      maxCharacters
    ) {
      break;
    }

    result += section + "\n\n";
  }

  return result.trim();
};


// ========================================
// Helper: Build AI context
// ========================================

const buildAIContext = (
  results,
  question
) => {
  const requestFlowQuestion =
    isRequestFlowQuestion(question);

  // Request-flow questions need multiple
  // implementation files and targeted sections.
  if (requestFlowQuestion) {
    const keywords = [
      "handle",
      "router",
      "route",
      "middleware",
      "request",
      "response",
      "req",
      "res",
      "app.use",
      "app.handle",
      "router.handle",
      "next(",
      "listen",
    ];

    return results
      .slice(0, 5)
      .map((file) => {
        const relevantContent =
          extractRelevantContext(
            file.content,
            keywords,
            4500
          );

        return `
FILE: ${file.path}

RELEVANT CODE:
${relevantContent}
`;
      })
      .join("\n\n---\n\n");
  }

  // Normal questions continue using the
  // most relevant three files.
  return results
    .slice(0, 3)
    .map((file) => {
      const limitedContent =
        file.content.slice(0, 6000);

      return `
FILE: ${file.path}

CONTENT:
${limitedContent}
`;
    })
    .join("\n\n---\n\n");
};


// ========================================
// INDEX REPOSITORY
// ========================================

router.post("/index", async (req, res) => {
  console.log("INDEX ROUTE HIT");

  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        message:
          "GitHub repository URL is required",
      });
    }

    const {
      owner,
      name,
    } = parseGitHubUrl(repoUrl);

    const githubRepo =
      await getRepository(
        owner,
        name
      );

    const tree =
      await getRepositoryTree(
        owner,
        name,
        githubRepo.default_branch
      );

    const filteredTree =
      filterRepositoryTree(tree);

    const indexableFiles =
      filteredTree.filter(
        (file) =>
          (file.size || 0) <=
          1024 * 1024
      );

    const repository =
      await Repository.create({
        owner,
        name,
        fullName:
          githubRepo.full_name,

        githubUrl:
          githubRepo.html_url,

        defaultBranch:
          githubRepo.default_branch,

        status: "ready",

        files: (
          await Promise.all(
            indexableFiles.map(
              async (file) => {
                const content =
                  await getFileContent(
                    owner,
                    name,
                    file.path,
                    githubRepo.default_branch
                  );

                if (content === null) {
                  return null;
                }

                return {
                  path: file.path,
                  type: file.type,
                  size:
                    file.size || 0,
                  content,
                };
              }
            )
          )
        ).filter(Boolean),
      });

    res.status(201).json({
      message:
        "Repository indexed successfully",

      repositoryId:
        repository._id,

      repositoryName:
        repository.fullName,

      filesFound:
        repository.files.length,
    });

  } catch (error) {
    console.error(
      "Repository indexing failed:",
      error.message
    );

    res.status(500).json({
      message:
        "Repository indexing failed",

      error:
        error.message,
    });
  }
});


// ========================================
// SEARCH REPOSITORY
// ========================================

router.get(
  "/:id/search",
  async (req, res) => {
    try {
      const { query } =
        req.query;

      if (!query) {
        return res.status(400).json({
          message:
            "Search query is required",
        });
      }

      const results =
        await searchRepository(
          req.params.id,
          query
        );

      res.json({
        query,
        results,
      });

    } catch (error) {
      console.error(
        "Repository search failed:",
        error.message
      );

      res.status(500).json({
        message:
          "Repository search failed",
      });
    }
  }
);


// ========================================
// ARCHITECTURE
// ========================================

router.get(
  "/:id/architecture",
  async (req, res) => {
    try {
      const architecture =
        await getArchitecture(
          req.params.id
        );

      res.json(
        architecture
      );

    } catch (error) {
      console.error(
        "Architecture generation failed:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to generate architecture",
      });
    }
  }
);


// ========================================
// ASK AI
// ========================================

router.post(
  "/:id/ask",
  async (req, res) => {
    try {
      const { question } =
        req.body;

      if (!question) {
        return res.status(400).json({
          message:
            "Question is required",
        });
      }

      // ------------------------------
      // Search repository
      // ------------------------------

      const results =
        await searchRepository(
          req.params.id,
          question
        );

      if (results.length === 0) {
        return res.json({
          answer:
            "I couldn't find relevant code for this question.",

          sources: [],
        });
      }

      // ------------------------------
      // Build intelligent RAG context
      // ------------------------------

      const context =
        buildAIContext(
          results,
          question
        );

      console.log(
        "AI context built for:",
        question
      );

      console.log(
        "Request-flow question:",
        isRequestFlowQuestion(
          question
        )
      );

      // ------------------------------
      // Ask Ollama
      // ------------------------------

      const answer =
        await askAI(
          question,
          context
        );

      // ------------------------------
      // Build source snippets
      // ------------------------------

      const sources =
        results
          .slice(
            0,
            isRequestFlowQuestion(
              question
            )
              ? 5
              : 5
          )
          .map((file) => {

            const lines =
              file.content.split(
                "\n"
              );

            const queryTerms =
              question
                .toLowerCase()
                .replace(
                  /[^\w\s]/g,
                  ""
                )
                .split(/\s+/)
                .filter(
                  (word) =>
                    word.length > 2
                );

            let bestLineIndex = 0;

            let bestScore = 0;

            lines.forEach(
              (
                line,
                index
              ) => {
                const lowerLine =
                  line.toLowerCase();

                const score =
                  queryTerms.reduce(
                    (
                      total,
                      term
                    ) => {
                      return (
                        total +
                        (
                          lowerLine.includes(
                            term
                          )
                            ? 1
                            : 0
                        )
                      );
                    },
                    0
                  );

                if (
                  score >
                  bestScore
                ) {
                  bestScore =
                    score;

                  bestLineIndex =
                    index;
                }
              }
            );

            const start =
              Math.max(
                0,
                bestLineIndex - 4
              );

            const end =
              Math.min(
                lines.length,
                bestLineIndex + 8
              );

            const snippet =
              lines
                .slice(
                  start,
                  end
                )
                .join("\n");

            return {
              path:
                file.path,

              snippet,

              startLine:
                start + 1,

              endLine:
                end,
            };
          });

      // ------------------------------
      // Final response
      // ------------------------------

      res.json({
        answer,
        sources,
      });

    } catch (error) {
      console.error(
        "AI question failed:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to answer question",

        error:
          error.message,
      });
    }
  }
);


// ========================================
// GET REPOSITORY
// ========================================

router.get(
  "/:id",
  async (req, res) => {
    try {
      const repository =
        await Repository.findById(
          req.params.id
        );

      if (!repository) {
        return res.status(404).json({
          message:
            "Repository not found",
        });
      }

      res.json(
        repository
      );

    } catch (error) {
      console.error(
        "Failed to fetch repository:",
        error.message
      );

      res.status(500).json({
        message:
          "Failed to fetch repository",
      });
    }
  }
);


module.exports = router;