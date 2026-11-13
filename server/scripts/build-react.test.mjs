import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverSource = path.resolve(scriptDirectory, '..');
const repositorySource = path.resolve(serverSource, '..');
const sourceScript = path.join(scriptDirectory, 'build-react.mjs');
const currentSnapshot = path.join(serverSource, 'deployment', 'frontend');

async function createFixture({ client = false, snapshot = true, validSnapshot = true } = {}) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'contextify-build-test-'));
  const server = path.join(temporaryRoot, 'server');
  await mkdir(path.join(server, 'scripts'), { recursive: true });
  await mkdir(path.join(server, 'public'), { recursive: true });
  await mkdir(path.join(server, 'deployment'), { recursive: true });
  await cp(sourceScript, path.join(server, 'scripts', 'build-react.mjs'));
  await writeFile(path.join(server, 'package.json'), JSON.stringify({
    private: true,
    type: 'module',
    scripts: { build: 'node scripts/build-react.mjs' },
  }));
  await writeFile(path.join(server, 'public', '.htaccess'), 'laravel rewrite rules\n');
  await writeFile(path.join(server, 'public', 'index.php'), '<?php // Laravel entry\n');
  await writeFile(path.join(server, 'public', 'robots.txt'), 'Laravel robots\n');

  if (snapshot) {
    const snapshotPath = path.join(server, 'deployment', 'frontend');
    if (validSnapshot) {
      await cp(currentSnapshot, snapshotPath, { recursive: true });
    } else {
      await mkdir(snapshotPath, { recursive: true });
      await writeFile(path.join(snapshotPath, 'index.html'), '<html>not a Contextify build</html>');
    }
  }

  if (client) await createClientFixture(temporaryRoot);
  return { temporaryRoot, server, snapshot: path.join(server, 'deployment', 'frontend') };
}

async function createClientFixture(root, { failedBuild = false } = {}) {
  const client = path.join(root, 'client');
  await mkdir(path.join(client, 'node_modules', 'vite'), { recursive: true });
  await mkdir(path.join(client, 'dist', 'contextify-assets'), { recursive: true });
  await writeFile(path.join(client, 'package-lock.json'), '{"lockfileVersion":3,"packages":{}}');
  await writeFile(path.join(client, 'node_modules', 'vite', 'package.json'), '{"name":"vite"}');

  const buildScript = failedBuild ? 'node fail-build.mjs' : 'node build-noop.mjs';
  await writeFile(path.join(client, 'package.json'), JSON.stringify({
    private: true,
    type: 'module',
    scripts: { build: buildScript },
  }));
  await writeFile(path.join(client, 'fail-build.mjs'), 'process.exit(7);\n');
  await writeFile(path.join(client, 'build-noop.mjs'), 'process.exit(0);\n');
  await writeFile(path.join(client, 'dist', 'index.html'), [
    '<!doctype html>',
    '<!-- CONTEXTIFY SPA ENTRY -->',
    '<link rel="icon" href="/logo.png">',
    '<script type="module" src="/contextify-assets/app.js"></script>',
    '<link rel="stylesheet" href="/contextify-assets/app.css">',
  ].join('\n'));
  await writeFile(path.join(client, 'dist', 'contextify-assets', 'app.js'), 'window.contextify = true;\n');
  await writeFile(path.join(client, 'dist', 'contextify-assets', 'app.css'), 'body { color: black; }\n');
  await writeFile(path.join(client, 'dist', 'logo.png'), 'fake image fixture\n');
}

function runLaravelBuild(server, extraEnvironment = {}) {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: server,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnvironment },
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

async function cleanup(fixture) {
  await rm(fixture.temporaryRoot, { recursive: true, force: true });
}

test('snapshot-only Laravel build works without a sibling client and preserves Laravel public files', async () => {
  const fixture = await createFixture();
  try {
    assert.equal(runLaravelBuild(fixture.server).status, 0);
    const html = await readFile(path.join(fixture.server, 'public', 'index.html'), 'utf8');
    assert.match(html, /CONTEXTIFY SPA ENTRY/);
    assert.equal(await readFile(path.join(fixture.server, 'public', '.htaccess'), 'utf8'), 'laravel rewrite rules\n');
    assert.equal(await readFile(path.join(fixture.server, 'public', 'index.php'), 'utf8'), '<?php // Laravel entry\n');
    assert.equal(await readFile(path.join(fixture.server, 'public', 'robots.txt'), 'utf8'), 'Laravel robots\n');
    assert.ok((await readdir(path.join(fixture.server, 'public', 'contextify-assets'))).length > 0);
  } finally {
    await cleanup(fixture);
  }
});

test('missing snapshot fails with an actionable message and does not create an entry page', async () => {
  const fixture = await createFixture({ snapshot: false });
  try {
    const result = runLaravelBuild(fixture.server);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /commit server\/deployment\/frontend/);
    await assert.rejects(readFile(path.join(fixture.server, 'public', 'index.html')));
  } finally {
    await cleanup(fixture);
  }
});

test('invalid snapshot is rejected without replacing Laravel public files', async () => {
  const fixture = await createFixture({ validSnapshot: false });
  try {
    const result = runLaravelBuild(fixture.server);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /not a Contextify React build/);
    assert.equal(await readFile(path.join(fixture.server, 'public', 'index.php'), 'utf8'), '<?php // Laravel entry\n');
    await assert.rejects(readFile(path.join(fixture.server, 'public', 'index.html')));
  } finally {
    await cleanup(fixture);
  }
});

test('source build failure does not silently deploy a previously valid snapshot', async () => {
  const fixture = await createFixture({ client: true });
  try {
    await createClientFixture(fixture.temporaryRoot, { failedBuild: true });
    const snapshotBefore = await readFile(path.join(fixture.snapshot, 'index.html'), 'utf8');
    const result = runLaravelBuild(fixture.server);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /npm run build/);
    assert.equal(await readFile(path.join(fixture.snapshot, 'index.html'), 'utf8'), snapshotBefore);
    await assert.rejects(readFile(path.join(fixture.server, 'public', 'index.html')));
  } finally {
    await cleanup(fixture);
  }
});

test('secret scanning rejects private values without echoing them', async () => {
  const fixture = await createFixture({ client: true });
  const secret = 'fake-only-gemini-secret-for-scan-test';
  try {
    await createClientFixture(fixture.temporaryRoot);
    await writeFile(path.join(fixture.temporaryRoot, 'client', 'dist', 'contextify-assets', 'app.js'), `const leaked = '${secret}';`);
    const result = runLaravelBuild(fixture.server, { GEMINI_API_KEY: secret });
    assert.notEqual(result.status, 0);
    assert.match(result.output, /private environment value/);
    assert.equal(result.output.includes(secret), false);
    await assert.rejects(readFile(path.join(fixture.server, 'public', 'index.html')));
  } finally {
    await cleanup(fixture);
  }
});

test('source output rejects maps and environment files', async () => {
  const fixture = await createFixture({ client: true });
  try {
    await createClientFixture(fixture.temporaryRoot);
    await writeFile(path.join(fixture.temporaryRoot, 'client', 'dist', 'contextify-assets', 'app.js.map'), '{}');
    const result = runLaravelBuild(fixture.server);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /prohibited development or secret file/);
  } finally {
    await cleanup(fixture);
  }
});
