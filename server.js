require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const chokidar = require('chokidar');

const VAULT_DIR = path.join(__dirname, 'vault_data');

// Ensure vault_data exists
if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VAULT_DIR),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

const app = express();
const PORT = 3001;
const LOG_FILE = path.join(__dirname, 'agent_log.json');

app.use(cors());
app.use(express.json());

// ─── SSE Event Emitter ──────────────────────────────────────────
let sseClients = [];

const broadcastEvent = (eventType, data) => {
  sseClients.forEach(client => {
    client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  });
};

// Watch auto-discovery directories from .env or fallback to vault_data
const WATCH_DIRS = process.env.SCAN_DIRECTORIES 
  ? process.env.SCAN_DIRECTORIES.split(',').map(d => d.trim()) 
  : [VAULT_DIR];

const watcher = chokidar.watch(WATCH_DIRS, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true // don't trigger on existing files at startup
});

let debounceTimer = null;
watcher.on('add', (filePath) => {
  const filename = path.basename(filePath);
  console.log(`[WatchGuard] New file detected locally: ${filename}`);
  
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // Tell frontend to start pipeline
    broadcastEvent('auto_trigger', { target: 'local', reason: `Auto-detected new file(s)` });
  }, 500);
});

// API: SSE Stream
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  const newClient = { id: Date.now(), res };
  sseClients.push(newClient);
  
  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== newClient.id);
  });
});


// API: Check status
app.get('/api/status', (req, res) => {
  res.json({ status: 'Aegis API Server is running', port: PORT });
});

// API: Get latest logs
app.get('/api/logs', (req, res) => {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const logData = fs.readFileSync(LOG_FILE, 'utf8');
      try {
        const logs = JSON.parse(logData);
        res.json(logs);
      } catch (e) {
        // If file is being written to or empty, return empty array safely
        res.json([]);
      }
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading logs:', error);
    res.json([]); // Return empty array instead of 500 to keep UI alive
  }
});

// API: Deploy the Agent
app.post('/api/deploy', (req, res) => {
  const { targets, config } = req.body;
  
  if (!targets || !Array.isArray(targets)) {
    return res.status(400).json({ error: 'targets array is required' });
  }

  console.log(`[API] Deploying AegisAgent for targets: ${targets.join(', ')}`);
  if (config) console.log(`[API] Configuration override:`, config);

  // Clear previous logs before starting a new run
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  // Write a startup log immediately so the UI knows we're booting up
  const initialLog = [{
    timestamp: new Date().toISOString(),
    cycle: 0,
    step: "STARTUP",
    decision: "Aegis API bridge received deploy command.",
    details: { targets, config },
    status: "SUCCESS"
  }];
  fs.writeFileSync(LOG_FILE, JSON.stringify(initialLog, null, 2));

  // Build arguments
  const args = ['main.py', '--once'];
  if (targets && targets.length > 0) {
    args.push('--targets', targets.join(','));
  }

  // Setup environment
  const env = { ...process.env };
  if (config && config.github_repo) {
    env.GITHUB_REPOS = config.github_repo;
  }

  // Spawn the Python orchestrator
  const pythonExecutable = path.resolve(__dirname, 'venv', 'bin', 'python3');
  
  const pythonProcess = spawn(pythonExecutable, args, {
    cwd: __dirname,
    env
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Agent stdout]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Agent stderr]: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[API] AegisAgent Python process exited with code ${code}`);
  });

  res.json({ status: 'Deploy command accepted', targets });
});

// API: Reset Agent (Manual wipe)
app.post('/api/reset', (req, res) => {
  console.log('[API] Resetting agent state and logs');
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
  }
  res.json({ status: 'Reset successful' });
});

// API: Upload files manually for protection
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const uploaded = req.files.map(f => ({
    name: f.originalname,
    size: f.size,
    path: f.path
  }));
  
  console.log(`[API] Received ${uploaded.length} file(s) for manual protection:`, uploaded.map(f => f.name));
  res.json({ status: 'Files received', files: uploaded });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║ AEGIS EXPRESS API BRIDGE                   ║
║ Listening on http://localhost:${PORT}           ║
╚════════════════════════════════════════════╝
`);
});
