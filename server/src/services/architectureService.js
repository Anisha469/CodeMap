const Repository = require("../models/Repository");

const getArchitecture = async (repositoryId) => {
  const repository = await Repository.findById(repositoryId);

  if (!repository) {
    throw new Error("Repository not found");
  }

  // Keep only important source files for the architecture graph.
  // All repository files are still available to search and view.
  const files = repository.files.filter((file) => {
    const path = file.path.toLowerCase();

    const ignoredDirectories = [
      "test/",
      "tests/",
      "examples/",
      ".github/",
      "docs/",
      "coverage/",
      "node_modules/",
    ];

    const ignoredFiles = [
      "readme.md",
      "license",
      "changelog.md",
      "history.md",
    ];

    const ignoredExtensions = [
      ".json",
      ".md",
      ".txt",
      ".yml",
      ".yaml",
      ".lock",
      ".xml",
    ];

    const isIgnoredDirectory =
      ignoredDirectories.some((directory) =>
        path.includes(directory)
      );

    const fileName = path.split("/").pop();
    const isDotFile = fileName.startsWith(".");

    const isIgnoredFile =
      ignoredFiles.includes(fileName);

    const isIgnoredExtension =
      ignoredExtensions.some((extension) =>
        path.endsWith(extension)
      );

    if (isIgnoredDirectory) {
      return false;
    }

    if (isIgnoredFile) {
      return false;
    }
    if (isDotFile) {
  return false;
}

    if (isIgnoredExtension) {
      return false;
    }

    return true;
  });

  // Create architecture nodes
  const nodes = files.map((file) => ({
    id: file.path,
    label: file.path,
    type: "file",
  }));

  const edges = [];

  // Create relationships between source files
  files.forEach((file) => {
    const imports = extractImports(file.content);

    imports.forEach((importPath) => {
      const targetFile = resolveImport(
        file.path,
        importPath,
        files
      );

      if (targetFile) {
        edges.push({
          source: file.path,
          target: targetFile,
        });
      }
    });
  });

  return {
    nodes,
    edges,
  };
};


// --------------------------------
// Extract import / require statements
// --------------------------------

const extractImports = (content) => {
  const imports = [];

  // ES module imports
  const importRegex =
    /import\s+(?:.*?\s+from\s+)?["'](.+?)["']/g;

  // CommonJS require()
  const requireRegex =
    /require\(\s*["'](.+?)["']\s*\)/g;

  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
};


// --------------------------------
// Resolve an import to a repository file
// --------------------------------

const resolveImport = (
  currentFile,
  importPath,
  files
) => {
  // Ignore external packages
  if (!importPath.startsWith(".")) {
    return null;
  }

  const currentDirectory =
    currentFile.includes("/")
      ? currentFile.substring(
          0,
          currentFile.lastIndexOf("/")
        )
      : "";

  let resolvedPath = currentDirectory
    ? `${currentDirectory}/${importPath}`
    : importPath;

  resolvedPath = resolvedPath.replace(
  /\/+/g,
  "/"
);

// Remove "./" from the beginning
resolvedPath = resolvedPath.replace(
  /^\.\//,
  ""
);

// Normalize nested "./" segments
resolvedPath = resolvedPath.replace(
  /\/\.\//g,
  "/"
);

  const possiblePaths = [
    resolvedPath,
    `${resolvedPath}.js`,
    `${resolvedPath}.jsx`,
    `${resolvedPath}.ts`,
    `${resolvedPath}.tsx`,
    `${resolvedPath}/index.js`,
    `${resolvedPath}/index.jsx`,
    `${resolvedPath}/index.ts`,
    `${resolvedPath}/index.tsx`,
  ];

  const match = files.find((file) =>
    possiblePaths.includes(file.path)
  );

  return match ? match.path : null;
};


const getImpactAnalysis = async (repositoryId, changedFile) => {
  const architecture = await getArchitecture(repositoryId);

  const affectedFiles = architecture.edges
    .filter((edge) => edge.target === changedFile)
    .map((edge) => edge.source);

  return {
    changedFile,
    affectedFiles,
  };
};

module.exports = {
  getArchitecture,
  getImpactAnalysis,
};