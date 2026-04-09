'use server';

import fs from 'fs/promises';
import path from 'path';

type PyqIndexEntry = {
  title: string;
  relativePath: string;
  directory: string;
  extension: string;
};

type PyqIndexFile = {
  generatedAt: string;
  totalFiles: number;
  assetBaseUrl?: string;
  entries: PyqIndexEntry[];
};

export type PyqSearchResult = {
  title: string;
  directory: string;
  relativePath: string;
  extension: string;
  url: string;
};

type LoadedPyqIndex = {
  assetBaseUrl?: string;
  entries: PyqIndexEntry[];
};

const globalAny = global as typeof globalThis & {
  pyqIndexCache?: Promise<LoadedPyqIndex>;
};

async function getFiles(dir: string): Promise<string[]> {
  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents.map((dirent) => {
        const resolvedPath = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(resolvedPath) : resolvedPath;
      })
    );

    return files.flat();
  } catch {
    return [];
  }
}

function normalizePathSeparators(value: string): string {
  return value.replace(/\\/g, '/');
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[._/\\()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function encodePathSegments(relativePath: string): string {
  return relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildAssetUrl(relativePath: string, assetBaseUrl?: string): string {
  const encodedPath = encodePathSegments(relativePath);

  if (assetBaseUrl) {
    return `${assetBaseUrl.replace(/\/+$/, '')}/${encodedPath}`;
  }

  return `/pyq/${encodedPath}`;
}

function getEntryScore(entry: PyqIndexEntry, normalizedQuery: string, tokens: string[]): number {
  const normalizedTitle = normalizeSearchText(entry.title);
  const normalizedDirectory = normalizeSearchText(entry.directory);
  const haystack = `${normalizedDirectory} ${normalizedTitle}`.trim();

  if (!tokens.every((token) => haystack.includes(token))) {
    return -1;
  }

  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 300;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    score += 150;
  }

  if (normalizedDirectory.includes(normalizedQuery)) {
    score += 75;
  }

  for (const token of tokens) {
    if (normalizedTitle.startsWith(token)) {
      score += 30;
    }

    if (normalizedTitle.includes(token)) {
      score += 20;
    }

    if (normalizedDirectory.includes(token)) {
      score += 10;
    }
  }

  score -= entry.directory.split('/').length;
  return score;
}

async function readRemoteIndex(indexUrl: string): Promise<LoadedPyqIndex | null> {
  try {
    const response = await fetch(indexUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`PYQ index request failed with status ${response.status}`);
    }

    const index = (await response.json()) as PyqIndexFile;

    return {
      assetBaseUrl: index.assetBaseUrl,
      entries: index.entries ?? [],
    };
  } catch (error) {
    console.error('Unable to load remote PYQ index:', error);
    return null;
  }
}

async function readLocalIndex(): Promise<LoadedPyqIndex | null> {
  try {
    const localIndexPath = path.join(process.cwd(), 'public', 'pyq-index.json');
    const raw = await fs.readFile(localIndexPath, 'utf8');
    const index = JSON.parse(raw) as PyqIndexFile;

    return {
      assetBaseUrl: index.assetBaseUrl,
      entries: index.entries ?? [],
    };
  } catch {
    return null;
  }
}

async function buildFallbackIndex(): Promise<LoadedPyqIndex> {
  const pyqDir = path.join(process.cwd(), 'public', 'pyq');
  const allFiles = await getFiles(pyqDir);
  const entries = allFiles.map((file) => {
    const relativePath = normalizePathSeparators(path.relative(pyqDir, file));
    const directory = normalizePathSeparators(path.dirname(relativePath));

    return {
      title: path.basename(relativePath),
      relativePath,
      directory: directory === '.' ? '' : directory,
      extension: path.extname(relativePath).toLowerCase(),
    };
  });

  return { entries };
}

async function loadPyqIndex(): Promise<LoadedPyqIndex> {
  const remoteIndexUrl = process.env.PYQ_INDEX_URL?.trim();

  if (remoteIndexUrl) {
    const remoteIndex = await readRemoteIndex(remoteIndexUrl);

    if (remoteIndex) {
      return remoteIndex;
    }
  }

  const localIndex = await readLocalIndex();

  if (localIndex) {
    return localIndex;
  }

  return buildFallbackIndex();
}

async function getCachedPyqIndex(): Promise<LoadedPyqIndex> {
  if (!globalAny.pyqIndexCache) {
    globalAny.pyqIndexCache = loadPyqIndex();
  }

  return globalAny.pyqIndexCache;
}

export async function searchPyq(
  query: string
): Promise<{ results: PyqSearchResult[]; totalMatches: number }> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { results: [], totalMatches: 0 };
  }

  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const { assetBaseUrl: indexedAssetBaseUrl, entries } = await getCachedPyqIndex();
  const runtimeAssetBaseUrl = process.env.PYQ_ASSET_BASE_URL?.trim();
  const assetBaseUrl = runtimeAssetBaseUrl || indexedAssetBaseUrl;

  const rankedResults = entries
    .map((entry) => ({
      entry,
      score: getEntryScore(entry, normalizedQuery, tokens),
    }))
    .filter((result) => result.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.entry.relativePath.localeCompare(right.entry.relativePath);
    });

  return {
    totalMatches: rankedResults.length,
    results: rankedResults.slice(0, 200).map(({ entry }) => ({
      title: entry.title,
      directory: entry.directory,
      relativePath: entry.relativePath,
      extension: entry.extension,
      url: buildAssetUrl(entry.relativePath, assetBaseUrl),
    })),
  };
}
