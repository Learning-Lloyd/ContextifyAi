import { spawn } from 'node:child_process';
import {
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(serverRoot, '..');
const clientRoot = path.join(repositoryRoot, 'client');
const clientPackage = path.join(clientRoot, 'package.json');
const clientDist = path.join(clientRoot, 'dist');
const deploymentRoot = path.join(serverRoot, 'deployment');
const snapshotRoot = path.join(deploymentRoot, 'frontend');
const publicRoot = path.join(serverRoot, 'public');
const entryMarker = '<!-- CONTEXTIFY SPA ENTRY -->';
const generatedAssetDirectory = 'contextify-assets';
const allowedRootAssets = new Set([
  'favicon.svg',
  'icons.svg',
  'logo-dark-bg.png',
  'logo-transparent.png',
  'logo.png',
]);
const forbiddenEnvironmentName = /(?:API_KEY|SECRET|TOKEN|PASSWORD|APP_KEY|DATABASE_URL|DB_URL|CREDENTIAL)/i;
const forbiddenTextPatterns = [
  /\b(?:GEMINI_API_KEY|OPENROUTER_API_KEY|DATABASE_URL|DB_URL|DB_PASSWORD|DB_USERNAME|APP_KEY|AWS_SECRET_ACCESS_KEY)\s*[:=]/i,
  /AIza[0-9A-Za-z_-]{30,}/,
  /sk-or-v1-[0-9A-Za-z]{20,}/,
  /\bsk-[0-9A-Za-z_-]{32,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function assertInsideServerRoot(target) {
  const relative = path.relative(serverRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to use a build path outside the Laravel server directory: ${target}`);
  }
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function runNpm(args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(' ')} failed (${signal ?? `exit ${code}`}).`));
    });
  });
}

async function collectSnapshotFiles(directory, relative = '') {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relative, entry.name);
    const normalizedName = entry.name.toLowerCase();

    if (entry.isSymbolicLink()) {
      throw new Error(`Frontend output must not contain symbolic links: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.vite'].includes(normalizedName)) {
        throw new Error(`Frontend output contains a development directory: ${relativePath}`);
      }
      files.push(...await collectSnapshotFiles(path.join(directory, entry.name), relativePath));
      continue;
    }

    if (!entry.isFile()) {
      throw new Error(`Frontend output contains an unsupported file entry: ${relativePath}`);
    }

    if (
      (normalizedName === '.htaccess' && path.resolve(directory) !== path.resolve(clientDist))
      || normalizedName.startsWith('.env')
      || normalizedName.endsWith('.map')
      || normalizedName.endsWith('.pem')
      || normalizedName.endsWith('.key')
      || normalizedName.includes('credentials')
    ) {
      throw new Error(`Frontend output contains a prohibited development or secret file: ${relativePath}`);
    }

    files.push({ absolutePath: path.join(directory, entry.name), relativePath });
  }

  return files;
}

function localAssetPath(reference) {
  let parsed;
  try {
    parsed = new URL(reference, 'https://contextify-snapshot.invalid/');
  } catch {
    return null;
  }

  if (parsed.origin !== 'https://contextify-snapshot.invalid') return null;
  const parts = parsed.pathname.split('/').filter(Boolean);
  const assetDirectoryIndex = parts.indexOf(generatedAssetDirectory);

  if (assetDirectoryIndex >= 0) {
    return path.join(generatedAssetDirectory, ...parts.slice(assetDirectoryIndex + 1));
  }

  return parts.length ? path.join(...parts) : null;
}

async function validateSnapshot(directory, label, environment = process.env) {
  if (path.resolve(directory) !== path.resolve(clientDist)) assertInsideServerRoot(directory);
  if (!(await exists(directory)) || !(await stat(directory)).isDirectory()) {
    throw new Error(`${label} is missing. Build the React app locally and commit server/deployment/frontend/.`);
  }

  const files = await collectSnapshotFiles(directory);
  const fileByPath = new Map(files.map((file) => [file.relativePath, file.absolutePath]));
  const entryPath = fileByPath.get('index.html');
  if (!entryPath) {
    throw new Error(`${label} has no index.html. Build the React app and refresh the deployment snapshot.`);
  }

  const html = await readFile(entryPath, 'utf8');
  if (!html.includes(entryMarker)) {
    throw new Error(`${label} is not a Contextify React build (entry marker is missing).`);
  }

  const javascriptReferences = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["']/gi)]
    .map((match) => match[1]);
  const stylesheetReferences = [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi)]
    .map((match) => match[1]);

  if (javascriptReferences.length === 0 || stylesheetReferences.length === 0) {
    throw new Error(`${label} must reference at least one compiled JavaScript file and one CSS file.`);
  }

  const htmlAssetReferences = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1]);

  for (const reference of [...new Set([...htmlAssetReferences, ...javascriptReferences, ...stylesheetReferences])]) {
    const relativeAssetPath = localAssetPath(reference);
    if (!relativeAssetPath) continue;

    let resolvedAssetPath = relativeAssetPath;
    if (!fileByPath.has(resolvedAssetPath)) {
      const basename = path.basename(relativeAssetPath);
      const matchingPaths = [...fileByPath.keys()].filter((filePath) => path.basename(filePath) === basename);
      if (matchingPaths.length === 1) resolvedAssetPath = matchingPaths[0];
    }

    if (!fileByPath.has(resolvedAssetPath)) {
      throw new Error(`${label} references a missing or external compiled asset.`);
    }
    if ((await stat(fileByPath.get(resolvedAssetPath))).size === 0) {
      throw new Error(`${label} references an empty compiled asset: ${resolvedAssetPath}`);
    }
  }

  if (!files.some((file) => file.relativePath.startsWith(`${generatedAssetDirectory}/`))) {
    throw new Error(`${label} is missing the ${generatedAssetDirectory} asset directory.`);
  }

  const privateValues = Object.entries(environment)
    .filter(([name, value]) => forbiddenEnvironmentName.test(name) && typeof value === 'string' && value.length >= 8)
    .map(([, value]) => value);

  for (const file of files) {
    const text = (await readFile(file.absolutePath)).toString('latin1');
    if (forbiddenTextPatterns.some((pattern) => pattern.test(text))) {
      throw new Error(`${label} contains a value matching a private credential pattern in ${file.relativePath}.`);
    }
    if (privateValues.some((value) => text.includes(value))) {
      throw new Error(`${label} contains a private environment value in ${file.relativePath}.`);
    }
  }

  return files;
}

async function copyTreeExcludingHtaccess(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name.toLowerCase() === '.htaccess') continue;
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyTreeExcludingHtaccess(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase() === 'index.html') {
        const html = await readFile(sourcePath, 'utf8');
        await writeFile(destinationPath, html.replace(/\r\n?/g, '\n'));
      } else {
        await copyFile(sourcePath, destinationPath);
      }
    } else {
      throw new Error(`Cannot include unsupported frontend output: ${sourcePath}`);
    }
  }
}

async function replaceDirectory(source, destination) {
  assertInsideServerRoot(destination);
  const parent = path.dirname(destination);
  const suffix = `${process.pid}-${Date.now()}`;
  const staging = path.join(parent, `.${path.basename(destination)}.staging-${suffix}`);
  const previous = path.join(parent, `.${path.basename(destination)}.previous-${suffix}`);
  assertInsideServerRoot(staging);
  assertInsideServerRoot(previous);

  await mkdir(parent, { recursive: true });
  try {
    await copyTreeExcludingHtaccess(source, staging);
    if (await exists(destination)) await rename(destination, previous);
    await rename(staging, destination);
    await rm(previous, { recursive: true, force: true });
  } catch (error) {
    if (!(await exists(destination)) && await exists(previous)) await rename(previous, destination);
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function writeSnapshotFromBuild(distDirectory) {
  const stage = path.join(deploymentRoot, `.frontend-build-${process.pid}-${Date.now()}`);
  assertInsideServerRoot(stage);

  try {
    await copyTreeExcludingHtaccess(distDirectory, stage);
    await validateSnapshot(stage, 'The new React build');
    await replaceDirectory(stage, snapshotRoot);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function copySnapshotToPublic() {
  await validateSnapshot(snapshotRoot, 'The committed React deployment snapshot');
  await mkdir(publicRoot, { recursive: true });

  const publicIndex = path.join(publicRoot, 'index.html');
  if (await exists(publicIndex)) {
    const existingIndex = await readFile(publicIndex, 'utf8');
    if (!existingIndex.includes(entryMarker)) {
      throw new Error(`Refusing to replace a non-Contextify public entry point: ${publicIndex}`);
    }
  }

  const snapshotIndex = await readFile(path.join(snapshotRoot, 'index.html'));
  await replaceDirectory(
    path.join(snapshotRoot, generatedAssetDirectory),
    path.join(publicRoot, generatedAssetDirectory),
  );

  for (const entry of await readdir(snapshotRoot, { withFileTypes: true })) {
    if (entry.name === 'index.html' || entry.name === generatedAssetDirectory) continue;
    const source = path.join(snapshotRoot, entry.name);
    const destination = path.join(publicRoot, entry.name);
    if (entry.isDirectory()) {
      await copySnapshotPublicDirectory(source, destination);
      continue;
    }

    if (!entry.isFile()) throw new Error(`Unexpected item in deployment snapshot: ${entry.name}`);
    await copySnapshotPublicFile(source, destination, allowedRootAssets.has(entry.name));
  }

  // Publish the entry point last so it never refers to assets that have not
  // finished copying into Laravel's public directory.
  await copyFile(path.join(snapshotRoot, 'index.html'), publicIndex);

  if (!snapshotIndex.equals(await readFile(publicIndex))) {
    throw new Error('The React entry point did not copy correctly into Laravel public/.');
  }
}

async function copySnapshotPublicDirectory(source, destination) {
  if (await exists(destination) && !(await stat(destination)).isDirectory()) {
    throw new Error(`Refusing to replace a Laravel public file with a frontend directory: ${destination}`);
  }
  await mkdir(destination, { recursive: true });

  for (const entry of await readdir(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copySnapshotPublicDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      await copySnapshotPublicFile(sourcePath, destinationPath, false);
    } else {
      throw new Error(`Unsupported frontend public asset: ${sourcePath}`);
    }
  }
}

async function copySnapshotPublicFile(source, destination, mayReplaceKnownBrandAsset) {
  if (await exists(destination) && !mayReplaceKnownBrandAsset) {
    const [existing, generated] = await Promise.all([readFile(destination), readFile(source)]);
    if (!existing.equals(generated)) {
      throw new Error(`Refusing to overwrite an unrelated Laravel public file: ${destination}`);
    }
  }
  await copyFile(source, destination);
}

async function buildFromSource() {
  if (!(await exists(clientPackage)) || !(await exists(path.join(clientRoot, 'package-lock.json')))) {
    throw new Error('React source is present but client/package.json or client/package-lock.json is missing.');
  }

  const buildEnv = { ...process.env };
  buildEnv.VITE_API_URL ||= '/api';
  buildEnv.VITE_BASE_PATH ||= '/';

  if (!(await exists(path.join(clientRoot, 'node_modules', 'vite', 'package.json')))) {
    await runNpm(['ci', '--include=dev'], clientRoot, buildEnv);
  }

  await runNpm(['run', 'build', '--', '--mode', 'production'], clientRoot, buildEnv);
  await validateSnapshot(clientDist, 'The React production build', buildEnv);
  await writeSnapshotFromBuild(clientDist);
}

assertInsideServerRoot(snapshotRoot);
assertInsideServerRoot(publicRoot);

if (await exists(clientRoot)) {
  // A source build failure aborts before refreshing or deploying the old snapshot.
  await buildFromSource();
  console.log('React deployment snapshot refreshed from client/ source.');
} else {
  console.log('React source is not present beside server/; using the committed deployment snapshot.');
}

await copySnapshotToPublic();
console.log(`React production assets copied into ${publicRoot}`);
