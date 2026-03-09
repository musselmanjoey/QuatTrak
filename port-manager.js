const { readFileSync, writeFileSync, existsSync } = require('fs');
const { homedir } = require('os');
const { join } = require('path');
const { createServer } = require('net');

const REGISTRY_PATH = join(homedir(), '.project-ports.json');
const BASE_PORT = 3001;
const MAX_PORT = 4000;

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveRegistry(registry) {
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function getNextAvailablePort(registry) {
  const usedPorts = new Set(Object.values(registry));
  for (let port = BASE_PORT; port <= MAX_PORT; port++) {
    if (!usedPorts.has(port)) {
      return port;
    }
  }
  throw new Error('No available ports in range');
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

async function getProjectPort(projectPath) {
  const registry = loadRegistry();
  const normalizedPath = projectPath.replace(/\\/g, '/').toLowerCase();

  if (registry[normalizedPath]) {
    const port = registry[normalizedPath];
    const inUse = await isPortInUse(port);
    if (inUse) {
      console.log(`Warning: Port ${port} for this project is already in use.`);
    }
    return port;
  }

  const port = getNextAvailablePort(registry);
  registry[normalizedPath] = port;
  saveRegistry(registry);
  console.log(`Assigned port ${port} to this project (saved to ${REGISTRY_PATH})`);
  return port;
}

// CLI interface
const args = process.argv.slice(2);

if (args[0] === 'list') {
  const registry = loadRegistry();
  console.log('\nProject Port Registry:');
  console.log('='.repeat(60));
  const entries = Object.entries(registry).sort((a, b) => a[1] - b[1]);
  for (const [path, port] of entries) {
    console.log(`${port}: ${path}`);
  }
} else if (args[0] === 'remove' && args[1]) {
  const registry = loadRegistry();
  const normalizedPath = args[1].replace(/\\/g, '/').toLowerCase();
  if (registry[normalizedPath]) {
    delete registry[normalizedPath];
    saveRegistry(registry);
    console.log(`Removed ${args[1]}`);
  }
} else if (args[0] === 'dev') {
  getProjectPort(process.cwd()).then(port => {
    const { execSync } = require('child_process');
    console.log(`Starting dev server on port ${port}...`);
    execSync(`npx next dev -p ${port}`, { stdio: 'inherit' });
  });
} else if (args[0] === 'get') {
  const projectPath = args[1] || process.cwd();
  getProjectPort(projectPath).then(port => {
    console.log(`Port for ${projectPath}: ${port}`);
  });
}
