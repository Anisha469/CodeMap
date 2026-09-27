const axios = require("axios");

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  },
});

const parseGitHubUrl = (repoUrl) => {
  const url = new URL(repoUrl);

  if (url.hostname !== "github.com") {
    throw new Error("Only GitHub URLs are supported");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Invalid GitHub repository URL");
  }

  return {
    owner: parts[0],
    name: parts[1].replace(".git", ""),
  };
};

const getRepository = async (owner, name) => {
  const response = await githubApi.get(
    `/repos/${owner}/${name}`
  );

  return response.data;
};

const getRepositoryTree = async (owner, name, branch) => {
  const response = await githubApi.get(
    `/repos/${owner}/${name}/git/trees/${branch}?recursive=1`
  );

  return response.data.tree;
};

const filterRepositoryTree = (tree) => {
  const ignoredDirectories = [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
  ];

  const ignoredExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".mp4",
    ".mp3",
    ".zip",
  ];

  return tree.filter((item) => {
    if (item.type !== "blob") {
      return false;
    }

    const path = item.path.toLowerCase();

    const isIgnoredDirectory = ignoredDirectories.some((directory) =>
      path.startsWith(directory)
    );

    const isIgnoredExtension = ignoredExtensions.some((extension) =>
      path.endsWith(extension)
    );

    return !isIgnoredDirectory && !isIgnoredExtension;
  });
};

const getFileContent = async (owner, name, path, branch) => {
  try {
    const encodedPath = path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");

    const response = await githubApi.get(
      `/repos/${owner}/${name}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`
    );

    if (response.data.content === undefined) {
  console.log(`Skipping file with no content: ${path}`);
  return null;
}

    const content = Buffer.from(
      response.data.content,
      "base64"
    ).toString("utf-8");

    return content;
  } catch (error) {
    console.error(
      `Failed to fetch file: ${path}`,
      error.response?.status,
      error.response?.data?.message || error.message
    );

    throw error;
  }
};

module.exports = {
  parseGitHubUrl,
  getRepository,
  getRepositoryTree,
  filterRepositoryTree,
  getFileContent,
};