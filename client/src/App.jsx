import { useState } from "react";
import axios from "axios";
import "./App.css";
import ArchitectureMap from "./ArchitectureMap";

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [repository, setRepository] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  // AI states
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiSources, setAiSources] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Highlighted AI source lines
  const [highlightedLines, setHighlightedLines] = useState(null);

  // Architecture state
  const [showArchitecture, setShowArchitecture] = useState(false);

  // Impact Analysis state
  const [impactData, setImpactData] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState("");

  // --------------------------------
  // Build file/folder tree
  // --------------------------------

  const buildFileTree = (files) => {
    const root = {};

    files.forEach((file) => {
      const parts = file.path.split("/");

      let current = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;

        if (!current[part]) {
          current[part] = isFile
            ? {
              type: "file",
              file,
            }
            : {
              type: "folder",
              children: {},
            };
        }

        if (!isFile) {
          current = current[part].children;
        }
      });
    });

    return root;
  };

  // --------------------------------
  // Expand / collapse folder
  // --------------------------------

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // --------------------------------
  // Select normal file
  // --------------------------------

  const handleFileClick = (file) => {
    setSelectedFile(file);

    // Remove AI highlighting when manually selecting a file
    setHighlightedLines(null);

    setTimeout(() => {
      const codeViewer =
        document.querySelector(".code-viewer");

      if (codeViewer) {
        codeViewer.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  // --------------------------------
  // Analyze impact of a selected file
  // --------------------------------

  const handleImpactAnalysis = async () => {
    if (!repository || !selectedFile) {
      return;
    }

    try {
      setImpactLoading(true);
      setImpactData(null);
      setImpactError("");

      const response = await axios.get(
        `https://codemap-server.onrender.com/api/repositories/${repository._id}/impact`,
        {
          params: {
            file: selectedFile.path,
          },
        }
      );

      setImpactData(response.data);
    } catch (error) {
      console.error(
        "Impact analysis error:",
        error.response?.data || error.message
      );

      setImpactError(
        error.response?.data?.message ||
        "Failed to analyze file impact."
      );
    } finally {
      setImpactLoading(false);
    }
  };

  // --------------------------------
  // Open AI source in Code Viewer
  // --------------------------------

  const handleSourceClick = (source) => {
    if (!repository || !source) {
      return;
    }

    const cleanSourcePath = source.path
      .trim()
      .replace(/^`+|`+$/g, "")
      .replace(/^["']|["']$/g, "");

    console.log(
      "AI source clicked:",
      cleanSourcePath
    );

    const sourceFile = repository.files.find(
      (file) => file.path === cleanSourcePath
    );

    if (!sourceFile) {
      console.log(
        "Source file not found in repository:",
        cleanSourcePath
      );

      return;
    }

    console.log(
      "Opening source file:",
      sourceFile.path
    );

    setSelectedFile(sourceFile);

    // --------------------------------
    // Set exact highlighted source lines
    // --------------------------------

    const sourceStartLine =
      Number(source.startLine) > 0
        ? Number(source.startLine)
        : 1;

    const sourceEndLine =
      Number(source.endLine) >= sourceStartLine
        ? Number(source.endLine)
        : sourceStartLine;

    // The backend sends the exact relevant line
    // separately from the surrounding source snippet.
    const highlightStartLine =
      Number(source.highlightStartLine) > 0
        ? Number(source.highlightStartLine)
        : sourceStartLine;

    const highlightEndLine =
      Number(source.highlightEndLine) >=
        highlightStartLine
        ? Number(source.highlightEndLine)
        : highlightStartLine;

    setHighlightedLines({
      start: highlightStartLine,
      end: highlightEndLine,
    });

    // --------------------------------
    // Expand folders leading to source
    // --------------------------------

    const parts = cleanSourcePath.split("/");

    if (parts.length > 1) {
      const foldersToExpand = {};

      for (let i = 1; i < parts.length; i++) {
        const folderPath = parts
          .slice(0, i)
          .join("/");

        foldersToExpand[folderPath] = true;
      }

      setExpandedFolders((prev) => ({
        ...prev,
        ...foldersToExpand,
      }));
    }

    // --------------------------------
    // Scroll to exact highlighted line
    // --------------------------------

    setTimeout(() => {
      const codeViewer =
        document.querySelector(".code-viewer");

      if (codeViewer) {
        codeViewer.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      const firstHighlightedLine =
        document.querySelector(
          `.code-line[data-line="${highlightStartLine}"]`
        );

      if (firstHighlightedLine) {
        setTimeout(() => {
          firstHighlightedLine.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 300);
      }
    }, 150);
  };

  // --------------------------------
  // Render repository file tree
  // --------------------------------

  const renderFileTree = (
    tree,
    parentPath = ""
  ) => {
    return Object.entries(tree).map(
      ([name, item]) => {
        const currentPath = parentPath
          ? `${parentPath}/${name}`
          : name;

        // File
        if (item.type === "file") {
          const isSelected =
            selectedFile?.path === item.file.path;

          return (
            <div
              key={item.file.path}
              className={`file-item ${isSelected
                  ? "selected-file"
                  : ""
                }`}
              onClick={() =>
                handleFileClick(item.file)
              }
            >
              📄 {name}
            </div>
          );
        }

        // Folder
        const isExpanded =
          expandedFolders[currentPath];

        return (
          <div key={currentPath}>
            <div
              className="folder-item"
              onClick={() =>
                toggleFolder(currentPath)
              }
            >
              {isExpanded ? "📂" : "📁"} {name}
            </div>

            {isExpanded && (
              <div className="folder-children">
                {renderFileTree(
                  item.children,
                  currentPath
                )}
              </div>
            )}
          </div>
        );
      }
    );
  };

  // --------------------------------
  // Index GitHub repository
  // --------------------------------

  const handleIndexRepository = async () => {
    try {
      if (!repoUrl.trim()) {
        setMessage(
          "Please enter a GitHub repository URL."
        );

        return;
      }

      setLoading(true);
      setMessage("Indexing repository...");

      // Clear previous repository state
      setRepository(null);
      setSelectedFile(null);
      setExpandedFolders({});
      setHighlightedLines(null);

      // Clear previous AI results
      setAiAnswer("");
      setAiSources([]);
      setAiError("");
      setAiQuestion("");

      // Send GitHub URL to backend
      const response = await axios.post(
        "https://codemap-server.onrender.com/api/repositories/index",
        {
          repoUrl: repoUrl.trim(),
        }
      );

      // Get repository ID
      const id = response.data.repositoryId;

      if (!id) {
        throw new Error(
          "Repository ID was not returned by the server."
        );
      }

      console.log("Repository ID:", id);

      // Fetch complete repository data
      const repositoryResponse =
        await axios.get(
          `https://codemap-server.onrender.com/api/repositories/${id}`
        );

      // Store repository data
      setRepository(
        repositoryResponse.data
      );

      setMessage(
        `Repository indexed successfully! Files found: ${response.data.filesFound}`
      );
    } catch (error) {
      console.error(
        "Repository indexing error:",
        error.response?.data ||
        error.message
      );

      setMessage(
        error.response?.data?.message ||
        error.message ||
        "Failed to index repository"
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // Ask AI about repository
  // --------------------------------

  const handleAskAI = async () => {
    if (!repository) {
      return;
    }

    const question = aiQuestion.trim();

    if (!question) {
      setAiError(
        "Please enter a question."
      );

      return;
    }

    try {
      setAiLoading(true);
      setAiAnswer("");
      setAiSources([]);
      setAiError("");
      setHighlightedLines(null);

      const response = await axios.post(
        `https://codemap-server.onrender.com/api/repositories/${repository._id}/ask`,
        {
          question,
        }
      );

      setAiAnswer(
        response.data.answer || ""
      );

      setAiSources(
        response.data.sources || []
      );
    } catch (error) {
      console.error(
        "AI ERROR:",
        error.response?.data ||
        error.message
      );

      setAiError(
        error.response?.data?.message ||
        "Failed to answer question."
      );
    } finally {
      setAiLoading(false);
    }
  };

  // --------------------------------
  // Render application
  // --------------------------------

  return (
    <div className="app">

      {/* --------------------------------
          Header
      -------------------------------- */}

      <div className="header">
        <div className="logo">
          CodeMap
        </div>

        <p className="subtitle">
          Understand your codebase.
        </p>
      </div>

      {/* --------------------------------
          Repository input
      -------------------------------- */}

      <div className="repo-form">
        <input
          className="repo-input"
          type="text"
          placeholder="Paste a GitHub repository URL"
          value={repoUrl}
          onChange={(e) =>
            setRepoUrl(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleIndexRepository();
            }
          }}
        />

        <button
          className="index-button"
          onClick={handleIndexRepository}
          disabled={loading}
        >
          {loading
            ? "Indexing..."
            : "Index Repository"}
        </button>
      </div>

      {/* --------------------------------
          Status message
      -------------------------------- */}

      {message && (
        <p className="message">
          {message}
        </p>
      )}

      {/* --------------------------------
          Repository workspace
      -------------------------------- */}

      {repository && (
        <>

          {/* --------------------------------
              Repository information
          -------------------------------- */}

          <div className="repository-header">

            <h2 className="repository-name">
              {repository.fullName}
            </h2>

            <p className="repository-info">
              {repository.files.length} files indexed
            </p>

            <div className="repository-meta">

              <span>
                🌿 {repository.defaultBranch}
              </span>

              <span>
                ● {repository.status}
              </span>

            </div>

          </div>

          {/* --------------------------------
              AI Section
          -------------------------------- */}

          <div className="ai-section">

            <h3>
              Ask CodeMap AI
            </h3>

            <p className="ai-description">
              Ask questions about this repository.
            </p>

            <div className="ai-input-row">

              <input
                className="repo-input"
                type="text"
                placeholder="e.g. Where is the main application entry point?"
                value={aiQuestion}
                onChange={(e) =>
                  setAiQuestion(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAskAI();
                  }
                }}
              />

              <button
                className="index-button"
                onClick={handleAskAI}
                disabled={aiLoading}
              >
                {aiLoading
                  ? "Thinking..."
                  : "Ask AI"}
              </button>

            </div>

            {/* AI Error */}

            {aiError && (
              <p className="message">
                {aiError}
              </p>
            )}

            {/* --------------------------------
                AI Answer
            -------------------------------- */}

            {aiAnswer && (
              <div className="ai-answer">

                <h3>
                  AI Answer
                </h3>

                <p className="ai-answer-text">
                  {aiAnswer}
                </p>

                {/* --------------------------------
                    AI Sources
                -------------------------------- */}

                {aiSources.length > 0 && (
                  <div className="ai-sources">

                    <h4>
                      Sources
                    </h4>

                    {aiSources.map((source) => (
                      <div
                        key={source.path}
                        className="source-item"
                      >

                        <button
                          type="button"
                          className="source-file"
                          onClick={() =>
                            handleSourceClick(
                              source
                            )
                          }
                        >
                          📄 {source.path}
                        </button>

                        <pre className="source-snippet">
                          {source.snippet
                            .split("\n")
                            .map(
                              (
                                line,
                                index
                              ) => {
                                const lineNumber =
                                  (source.startLine ||
                                    1) +
                                  index;

                                return (
                                  <div
                                    key={
                                      lineNumber
                                    }
                                    className="source-code-line"
                                  >

                                    <span className="source-line-number">
                                      {lineNumber}
                                    </span>

                                    <span className="source-line-content">
                                      {line ||
                                        " "}
                                    </span>

                                  </div>
                                );
                              }
                            )}
                        </pre>

                      </div>
                    ))}

                  </div>
                )}

              </div>
            )}

          </div>

          {/* --------------------------------
              Architecture Section
              Full width ABOVE workspace
          -------------------------------- */}

          <div className="architecture-section">

            <button
              className="index-button"
              onClick={() =>
                setShowArchitecture(
                  (prev) => !prev
                )
              }
            >
              {showArchitecture
                ? "Hide Architecture"
                : "View Architecture"}
            </button>

            {showArchitecture && (
              <div className="architecture-container">

                <h3>
                  Repository Architecture
                </h3>

                <p className="ai-description">
                  Visualize relationships between
                  files in this repository.
                </p>

                <ArchitectureMap
                  repositoryId={
                    repository._id
                  }
                />

              </div>
            )}

          </div>

          {/* --------------------------------
              Main workspace
              File Explorer + Code Viewer
          -------------------------------- */}

          <div className="workspace">

            {/* File Explorer */}

            <div className="file-explorer">

              <div className="panel-header">
                Files
              </div>

              <div className="file-list">

                {renderFileTree(
                  buildFileTree(
                    repository.files
                  )
                )}

              </div>

            </div>

            {/* Code Viewer */}

            <div className="code-viewer">

              <div className="panel-header code-viewer-header">
                <span>
                  {selectedFile
                    ? selectedFile.path
                    : "Code Viewer"}
                </span>

                {selectedFile && (
                  <button
                    className="impact-button"
                    onClick={handleImpactAnalysis}
                    disabled={impactLoading}
                  >
                    {impactLoading
                      ? "Analyzing..."
                      : "Analyze Impact"}
                  </button>
                )}
              </div>

              {impactData && (
                <div className="impact-panel">
                  <h3>Impact Analysis</h3>

                  <p>
                    <strong>Changed file:</strong>{" "}
                    {impactData.changedFile}
                  </p>

                  <h4>Affected files</h4>

                  {impactData.affectedFiles.length > 0 ? (
                    <div className="impact-file-list">
                      {impactData.affectedFiles.map((filePath) => (
                        <button
                          key={filePath}
                          className="impact-file"
                          onClick={() => {
                            const affectedFile =
                              repository.files.find(
                                (file) => file.path === filePath
                              );

                            if (affectedFile) {
                              handleFileClick(affectedFile);
                            }
                          }}
                        >
                          → {filePath}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="impact-empty">
                      No directly affected files found.
                    </p>
                  )}
                </div>
              )}

              <div className="code-content">

                {selectedFile ? (
                  <pre className="code-block">

                    {selectedFile.content
                      .split("\n")
                      .map(
                        (line, index) => {
                          const lineNumber =
                            index + 1;

                          const isHighlighted =
                            highlightedLines &&
                            lineNumber >=
                            highlightedLines.start &&
                            lineNumber <=
                            highlightedLines.end;

                          return (
                            <div
                              key={lineNumber}
                              data-line={lineNumber}
                              className={`code-line ${isHighlighted
                                  ? "highlighted-code-line"
                                  : ""
                                }`}
                            >

                              <span className="code-line-number">
                                {lineNumber}
                              </span>

                              <span className="code-line-content">
                                {line || " "}
                              </span>

                            </div>
                          );
                        }
                      )}

                  </pre>
                ) : (
                  <p>
                    Click a file to view its
                    contents.
                  </p>
                )}

              </div>

            </div>

          </div>

        </>
      )}

    </div>
  );
}

export default App;