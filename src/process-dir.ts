import fs from "node:fs/promises";
import * as path from "node:path";
import { shouldExcludePath } from "./should-exclude-path";

interface Stats {
  children?: Stats[];
  name: string;
  path: string;
  size: number;
}

export const processDir = async (
  rootPath = "",
  excludedPaths: string[] = [],
  excludedGlobs: string[] = [],
) => {
  const foldersToIgnore = [".git", ...excludedPaths];
  const fullPathFoldersToIgnore = new Set(
    foldersToIgnore.map((d) => path.join(rootPath, d)),
  );

  const getFileStats = async (filePath = "") => {
    const stats = await fs.stat(`./${filePath}`);
    const name = filePath.split("/").filter(Boolean).slice(-1)[0];
    const size = stats.size;
    const relativePath = filePath.slice(rootPath.length + 1);
    return {
      name,
      path: relativePath,
      size,
    };
  };
  const addItemToTree = async (
    itemPath = "",
    isDirectory = true,
  ): Promise<Stats | null> => {
    try {
      console.log("Looking in ", `./${itemPath}`);

      if (isDirectory) {
        const dirents = await fs.readdir(`./${itemPath}`);
        const children = [];

        for (const dirent of dirents) {
          const fullPath = path.join(itemPath, dirent);
          if (
            shouldExcludePath(fullPath, fullPathFoldersToIgnore, excludedGlobs)
          ) {
            continue;
          }

          const info = await fs.stat(`./${fullPath}`);
          const stats = await addItemToTree(fullPath, info.isDirectory());
          if (stats) children.push(stats);
        }

        const stats = await getFileStats(itemPath);
        return { ...stats, children };
      }

      if (shouldExcludePath(itemPath, fullPathFoldersToIgnore, excludedGlobs)) {
        return null;
      }
      return getFileStats(itemPath);
    } catch (e) {
      console.log("Issue trying to read file", itemPath, e);
      return null;
    }
  };

  const tree = await addItemToTree(rootPath);

  return tree;
};
