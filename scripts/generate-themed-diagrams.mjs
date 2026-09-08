import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  prepareThemedMermaidSvgDualOutput,
} from '@dev-centr/mermaid-svg-css-vars';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const images = join(root, 'docs/modules/ROOT/images');
const check = process.argv.includes('--check');
const mermaidConfig = join(root, 'scripts/mermaid-config.json');

const diagrams = [
  {
    stem: 'actor-model-agentic-ui/node-graph-topology',
    title: 'Actor-model agentic UI node graph',
    description: 'A coordinator discussion spawns task and discussion nodes projected into a grid, while summaries and node metadata persist on disk.',
  },
  {
    stem: 'project-inbox/actor-topology',
    title: 'Project inbox actor topology',
    description: 'One canonical thread fans out to task cards, fork views, and mailbox summaries without loading full forks.',
  },
  {
    stem: 'spatial-web-windows/communication-topology',
    title: 'Spatial web windows communication topology',
    description: 'A viewport and lightweight palette windows communicate through a SharedWorker hub.',
  },
  {
    stem: 'an-alternative-to-urls/label-wire-breakage/label-wire-breakage',
    title: 'Label and wire breakage',
    description: 'A producer rename breaks string-bound links in a README, Antora navigation, and a blog citation.',
  },
  {
    stem: 'an-alternative-to-urls/application-vs-network-naming/application-vs-network-naming',
    title: 'Application versus network naming',
    description: 'Application semantic lifecycle and network delivery solve separate naming problems.',
  },
  {
    stem: 'an-alternative-to-urls/content-identity-resolution-stack/content-identity-resolution-stack',
    title: 'Content identity resolution stack',
    description: 'Consumers resolve mutable human pointers to content identities while reverse-consumer records absorb label changes.',
  },
];

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, shell: process.platform === 'win32' });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited ${code}\n${stderr}`));
    });
  });
}

async function assertOrWrite(path, content) {
  if (check) {
    const current = await readFile(path, 'utf8').catch(() => '');
    if (current !== content) throw new Error(`stale generated diagram: ${path.slice(root.length + 1)}`);
    return;
  }
  await writeFile(path, content, 'utf8');
}

const temp = await mkdtemp(join(tmpdir(), 'hci-themed-diagrams-'));
try {
  for (const diagram of diagrams) {
    const base = join(images, diagram.stem);
    const manifest = JSON.parse(await readFile(`${base}.theme.json`, 'utf8'));
    let rendered;
    const raw = join(temp, `${basename(base)}.raw.svg`);
    await run('pnpm', [
      'exec',
      'mmdc',
      '-i',
      `${base}.mmd`,
      '-o',
      raw,
      '-c',
      mermaidConfig,
      '-b',
      'transparent',
    ]);
    rendered = await readFile(raw, 'utf8');

    const metadata = {
      role: 'img',
      title: diagram.title,
      description: diagram.description,
    };
    const result = prepareThemedMermaidSvgDualOutput(rendered, manifest, { metadata });
    const errors = result.diagnostics.filter(({ severity }) => severity === 'error');
    if (errors.length || !result.standaloneSvg || !result.hostSvg) {
      throw new Error(`${diagram.stem}: ${JSON.stringify(result.diagnostics, null, 2)}`);
    }
    await assertOrWrite(`${base}.svg`, result.standaloneSvg);
    await assertOrWrite(`${base}.host.svg`, result.hostSvg);

  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
