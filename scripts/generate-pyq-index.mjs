import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--input' && next) {
      options.input = next;
      index += 1;
    } else if (current === '--output' && next) {
      options.output = next;
      index += 1;
    } else if (current === '--asset-base-url' && next) {
      options.assetBaseUrl = next;
      index += 1;
    }
  }

  return options;
}

async function walkFiles(directory) {
  const dirents = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const resolvedPath = path.join(directory, dirent.name);

      if (dirent.isDirectory()) {
        return walkFiles(resolvedPath);
      }

      return [resolvedPath];
    })
  );

  return files.flat();
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();
  const inputDir = path.resolve(projectRoot, options.input ?? 'public/pyq');
  const outputFile = path.resolve(projectRoot, options.output ?? 'public/pyq-index.json');
  const assetBaseUrl = options.assetBaseUrl ?? process.env.PYQ_ASSET_BASE_URL ?? undefined;

  let stats;
  try {
    stats = await fs.stat(inputDir);
  } catch {
    console.error(`PYQ source folder not found: ${inputDir}`);
    process.exit(1);
  }

  if (!stats.isDirectory()) {
    console.error(`PYQ source path is not a directory: ${inputDir}`);
    process.exit(1);
  }

  const files = await walkFiles(inputDir);
  const entries = files
    .map((file) => {
      const relativePath = toPosixPath(path.relative(inputDir, file));
      const directory = toPosixPath(path.dirname(relativePath));

      return {
        title: path.basename(relativePath),
        relativePath,
        directory: directory === '.' ? '' : directory,
        extension: path.extname(relativePath).toLowerCase(),
      };
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const payload = {
    generatedAt: new Date().toISOString(),
    totalFiles: entries.length,
    ...(assetBaseUrl ? { assetBaseUrl } : {}),
    entries,
  };

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${entries.length} PYQ entries to ${outputFile}`);
  if (assetBaseUrl) {
    console.log(`Asset base URL: ${assetBaseUrl}`);
  }
}

main().catch((error) => {
  console.error('Failed to generate PYQ index:', error);
  process.exit(1);
});
