#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║  AEGIS AUTONOMOUS BRAIN                                      ║
║  The sovereign decision engine for the ZK-Sentinel agent.    ║
║                                                              ║
║  Loop: DISCOVER → PLAN → EXECUTE → VERIFY → IMPACT          ║
║  Safety: Guardrails, budgets, and structured logging.        ║
╚══════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import time
import shutil
import hashlib
import argparse
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ─── Configuration ────────────────────────────────────────────

LOG_FILE = "agent_log.json"
VAULT_DIR = os.getenv("STORAGE_DIRECTORY", "./vault_data")
ARCHIVE_DIR = os.getenv("ARCHIVE_DIRECTORY", "./vault_data_archived")
MAX_TASKS_PER_CYCLE = int(os.getenv("MAX_TASKS_PER_CYCLE", "10"))
HEARTBEAT_SECONDS = int(os.getenv("HEARTBEAT_SECONDS", "30"))
MAX_RUNTIME_MINUTES = int(os.getenv("MAX_RUNTIME_MINUTES", "60"))
TS_NODE_TIMEOUT = int(os.getenv("TS_NODE_TIMEOUT", "120"))

# ─── Real Scanning Configuration ─────────────────────────────
# Comma-separated list of directories the agent is authorized to scan
SCAN_DIRECTORIES = [d.strip() for d in os.getenv("SCAN_DIRECTORIES", VAULT_DIR).split(',') if d.strip()]

# GitHub configuration for real repo scanning
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPOS = [r.strip() for r in os.getenv("GITHUB_REPOS", "").split(',') if r.strip()]

# File extensions to scan
SCANNABLE_EXTENSIONS = {
    '.py', '.js', '.ts', '.tsx', '.jsx', '.json', '.yaml', '.yml',
    '.env', '.cfg', '.ini', '.toml', '.conf', '.config',
    '.txt', '.md', '.csv', '.log', '.xml', '.html',
    '.sql', '.sh', '.bash', '.zsh', '.bat', '.ps1',
    '.pem', '.key', '.crt', '.cer', '.pfx',
    '.doc', '.docx', '.pdf', '.xls', '.xlsx',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.mp4', '.mov', '.zip', '.gz', '.tar',
}

# Directories to always skip during scanning
SKIP_DIRS = {
    '.git', 'node_modules', '__pycache__', '.next', '.nuxt',
    'dist', 'build', '.cache', '.venv', 'venv', 'env',
    '.expo', '.idea', '.vscode', 'coverage', '.turbo',
    'vault_data_archived',
}

# Maximum file size to scan (5MB)
MAX_FILE_SIZE = int(os.getenv("MAX_SCAN_FILE_SIZE", str(5 * 1024 * 1024)))


# ─── Autonomous Agent Class ──────────────────────────────────

class AegisAgent:
    """The autonomous decision-making brain of the Aegis ZK-Sentinel."""

    def __init__(self, targets: list | None = None):
        self.start_time = datetime.now()
        self.targets = targets or ['local']
        self.cycle_count = 0
        self.tasks_completed = 0
        self.tasks_failed = 0
        self.tasks_skipped = 0
        self.total_bytes_protected = 0
        self.logs: list = []
        self.processed_hashes: set = set()

        # Ensure directories exist
        Path(VAULT_DIR).mkdir(parents=True, exist_ok=True)
        Path(ARCHIVE_DIR).mkdir(parents=True, exist_ok=True)
        Path("logs").mkdir(parents=True, exist_ok=True)

        # Load previous logs
        self._load_logs()
        self._load_processed_hashes()

        # Find ts-node binary
        self.ts_node_bin = self._find_ts_node()

    def _find_ts_node(self) -> str:
        """Locate the ts-node binary."""
        local_bin = os.path.join("node_modules", ".bin", "ts-node")
        if os.path.exists(local_bin):
            return local_bin
        # Fallback to PATH
        return "ts-node"

    def _load_logs(self):
        """Load existing agent log entries."""
        if os.path.exists(LOG_FILE):
            try:
                with open(LOG_FILE, 'r') as f:
                    self.logs = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.logs = []

    def _load_processed_hashes(self):
        """Load hashes of previously processed files to avoid duplicates."""
        for entry in self.logs:
            if entry.get("step") == "VERIFY" and entry.get("status") == "SUCCESS":
                file_hash = entry.get("details", {}).get("file_hash")
                if file_hash:
                    self.processed_hashes.add(file_hash)

    def _save_logs(self):
        """Persist logs to disk."""
        with open(LOG_FILE, 'w') as f:
            json.dump(self.logs, f, indent=2)

    # ─── Logging ──────────────────────────────────────────────

    def log(self, step: str, decision: str, details: dict, status: str = "SUCCESS"):
        """Append a structured log entry."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "cycle": self.cycle_count,
            "step": step,
            "decision": decision,
            "details": details,
            "status": status
        }
        self.logs.append(entry)
        self._save_logs()

        # Console output
        icon = {"SUCCESS": "✅", "FAILED": "❌", "SKIPPED": "⏭️",
                "HALTED": "🛑", "ERROR": "💥"}.get(status, "📋")
        print(f"  {icon} [{step}] {decision}")

    # ─── Data Connectors ──────────────────────────────────────

    def _sync_github(self):
        """Clone user's real GitHub repositories for analysis."""
        github_dir = os.path.join(VAULT_DIR, "github_sync")
        Path(github_dir).mkdir(parents=True, exist_ok=True)

        if not GITHUB_TOKEN or not GITHUB_REPOS:
            self.log("SYNC", "GitHub: No token or repos configured. Using demo repo.", {
                "target": "github",
                "has_token": bool(GITHUB_TOKEN),
                "repo_count": len(GITHUB_REPOS)
            })
            # Fallback: clone a small public repo for demo
            demo_dir = os.path.join(github_dir, "demo-repo")
            if not os.path.exists(demo_dir):
                try:
                    subprocess.run(
                        ["git", "clone", "--depth", "1", "https://github.com/octocat/Spoon-Knife.git", demo_dir],
                        check=True, capture_output=True, timeout=30
                    )
                    self.log("SYNC", "Cloned demo repo (octocat/Spoon-Knife) for testing.", {}, "SUCCESS")
                except Exception as e:
                    self.log("SYNC", f"Failed to clone demo repo: {e}", {}, "ERROR")
            return

        self.log("SYNC", f"Syncing {len(GITHUB_REPOS)} GitHub repo(s)...", {
            "target": "github",
            "repos": GITHUB_REPOS
        })

        for repo_slug in GITHUB_REPOS:
            repo_name = repo_slug.split('/')[-1] if '/' in repo_slug else repo_slug
            dest_dir = os.path.join(github_dir, repo_name)

            # Build authenticated clone URL
            if '/' in repo_slug:
                clone_url = f"https://{GITHUB_TOKEN}@github.com/{repo_slug}.git"
            else:
                clone_url = f"https://{GITHUB_TOKEN}@github.com/{repo_slug}.git"

            try:
                if os.path.exists(dest_dir):
                    # Pull latest changes
                    self.log("SYNC", f"Pulling latest for {repo_name}...", {"repo": repo_slug})
                    subprocess.run(
                        ["git", "-C", dest_dir, "pull", "--ff-only"],
                        check=True, capture_output=True, timeout=60
                    )
                else:
                    # Shallow clone (depth 1 for speed)
                    self.log("SYNC", f"Cloning {repo_slug}...", {"repo": repo_slug})
                    subprocess.run(
                        ["git", "clone", "--depth", "1", clone_url, dest_dir],
                        check=True, capture_output=True, timeout=120
                    )

                self.log("SYNC", f"GitHub repository '{repo_name}' synced successfully.", {
                    "repo": repo_slug, "path": dest_dir
                }, "SUCCESS")

            except subprocess.TimeoutExpired:
                self.log("SYNC", f"Timeout cloning {repo_slug}", {"repo": repo_slug}, "ERROR")
            except Exception as e:
                self.log("SYNC", f"Failed to sync {repo_slug}: {e}", {"repo": repo_slug}, "ERROR")

    # ─── Stage 1: DISCOVER ────────────────────────────────────

    def discover(self) -> list:
        """Autonomously scan real data sources based on selected targets."""

        # 1. Sync external sources first
        if 'github' in self.targets:
            self._sync_github()

        # 2. Determine which directories to scan
        scan_dirs = []

        if 'local' in self.targets:
            # Use configured SCAN_DIRECTORIES for real local scanning
            for d in SCAN_DIRECTORIES:
                abs_d = os.path.abspath(d)
                if os.path.isdir(abs_d):
                    scan_dirs.append(abs_d)
                    self.log("DISCOVER", f"Added local scan directory: {abs_d}", {
                        "directory": abs_d
                    })
                else:
                    self.log("DISCOVER", f"Scan directory not found: {abs_d}", {
                        "directory": abs_d
                    }, "SKIPPED")

        if 'github' in self.targets:
            github_sync_path = os.path.join(VAULT_DIR, "github_sync")
            if os.path.exists(github_sync_path):
                scan_dirs.append(os.path.abspath(github_sync_path))

        # Fallback to vault_data if nothing is configured
        if not scan_dirs:
            scan_dirs.append(os.path.abspath(VAULT_DIR))

        all_files = []
        for scan_dir in scan_dirs:
            if not os.path.exists(scan_dir):
                continue

            file_count = 0
            for root, dirs, files in os.walk(scan_dir):
                # Filter out directories we should skip
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

                for f in files:
                    if f.startswith('.'):
                        continue

                    # Only scan known file types
                    _, ext = os.path.splitext(f)
                    if ext.lower() not in SCANNABLE_EXTENSIONS:
                        continue

                    full_path = os.path.join(root, f)

                    # Skip archive directory
                    if os.path.abspath(ARCHIVE_DIR) in os.path.abspath(full_path):
                        continue

                    # Skip files that are too large
                    try:
                        fsize = os.path.getsize(full_path)
                        if fsize > MAX_FILE_SIZE:
                            continue
                        if fsize == 0:
                            continue
                    except OSError:
                        continue

                    file_hash = self._hash_file(full_path)

                    # Skip already-processed files
                    if file_hash in self.processed_hashes:
                        continue

                    # Determine source label
                    if 'github_sync' in full_path:
                        source = 'GitHub'
                    else:
                        source = 'Local FS'

                    all_files.append({
                        "file": f,
                        "path": full_path,
                        "size": fsize,
                        "hash": file_hash,
                        "source": source
                    })
                    file_count += 1

            self.log("DISCOVER", f"Scanned {scan_dir}: found {file_count} new file(s).", {
                "directory": scan_dir,
                "new_files": file_count
            })

        self.log("DISCOVER", f"Total: {len(all_files)} new item(s) across {len(scan_dirs)} directory(ies).", {
            "targets": self.targets,
            "scan_dirs": scan_dirs,
            "total_items": len(all_files),
            "previously_processed": len(self.processed_hashes)
        })

        return all_files

    # ─── Stage 2: PLAN ────────────────────────────────────────

    def plan(self, items: list) -> list:
        """Autonomously prioritize and plan the protection order."""
        # Sort by file size (larger = potentially more sensitive)
        prioritized = sorted(items, key=lambda x: x["size"], reverse=True)

        # Limit to max tasks per cycle
        tasks = prioritized[:MAX_TASKS_PER_CYCLE]

        self.log("PLAN", f"Planned {len(tasks)} task(s) for execution.", {
            "plan_size": len(tasks),
            "total_available": len(items),
            "max_per_cycle": MAX_TASKS_PER_CYCLE,
            "files": [t["file"] for t in tasks]
        })

        return tasks

    # ─── Stage 3: EXECUTE ─────────────────────────────────────

    def execute(self, task: dict) -> bool:
        """Delegate to the TypeScript 5-Stage Orchestrator."""
        file_name = task["file"]
        file_path = task["path"]
        file_hash = task["hash"]

        self.log("EXECUTE", f"Initiating protection for: {file_name}", {
            "task_id": file_hash[:12],
            "file": file_name,
            "size_bytes": task["size"]
        })

        try:
            cmd = [self.ts_node_bin, "src/index.ts", "PROTECT_ASSET", file_path]

            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=TS_NODE_TIMEOUT,
                cwd=os.path.dirname(os.path.abspath(__file__)) or "."
            )

            # Parse the structured output
            stdout = proc.stdout
            stderr = proc.stderr

            if "__AEGIS_RESULT__:" in stdout:
                result_str = stdout.split("__AEGIS_RESULT__:")[1].strip().split("\n")[0]
                result = json.loads(result_str)

                if result.get("status") == "SUCCESS":
                    return self._verify_and_archive(task, result)
                elif result.get("status") == "SKIPPED":
                    self.log("EXECUTE", f"Skipped {file_name}: not sensitive.", result, "SKIPPED")
                    self.tasks_skipped += 1
                    self.processed_hashes.add(file_hash)
                    return True
                else:
                    self.log("EXECUTE", f"Pipeline error for {file_name}", result, "FAILED")
                    self.tasks_failed += 1
                    return False
            else:
                # No structured output — log stderr for debugging
                out_str = str(stdout) if stdout else ""
                err_str = str(stderr) if stderr else ""
                self.log("ERROR", f"No structured output from orchestrator for {file_name}", {
                    "stdout_tail": out_str[-500:] if len(out_str) > 500 else out_str,
                    "stderr_tail": err_str[-500:] if len(err_str) > 500 else err_str
                }, "FAILED")
                self.tasks_failed += 1
                return False

        except subprocess.TimeoutExpired:
            self.log("ERROR", f"Orchestrator timeout for {file_name}", {
                "timeout_seconds": TS_NODE_TIMEOUT
            }, "FAILED")
            self.tasks_failed += 1
            return False

        except Exception as e:
            self.log("CRITICAL", f"Execution exception: {str(e)}", {
                "file": file_name,
                "error_type": type(e).__name__
            }, "ERROR")
            self.tasks_failed += 1
            return False

    # ─── Stage 4: VERIFY ──────────────────────────────────────

    def _verify_and_archive(self, task: dict, result: dict) -> bool:
        """Verify the pipeline result and archive the processed file."""
        file_name = task["file"]
        file_path = task["path"]
        file_hash = task["hash"]

        # Log verified result
        self.log("VERIFY", f"Protection verified for {file_name}", {
            "file_hash": file_hash,
            "agent_id": result.get("agent_id"),
            "storage_url": result.get("storage_url"),
            "impact_token": result.get("impact_token"),
            "classification": result.get("classification"),
            "zk_verified": result.get("zk_verified"),
            "execution_time_ms": result.get("execution_time_ms")
        })

        # Move file to archive
        archive_path = os.path.join(ARCHIVE_DIR, file_name)
        try:
            # Handle duplicate filenames in archive
            if os.path.exists(archive_path):
                base, ext = os.path.splitext(file_name)
                archive_path = os.path.join(ARCHIVE_DIR, f"{base}_{file_hash[:8]}{ext}")

            shutil.move(file_path, archive_path)
            
            # Move the Aegis Cipher encrypted file if it exists
            enc_file_path = f"{file_path}.aegis.enc"
            if os.path.exists(enc_file_path):
                shutil.move(enc_file_path, f"{archive_path}.aegis.enc")
                
            self.log("ARCHIVE", f"Moved {file_name} → {os.path.basename(archive_path)}", {
                "source": file_path,
                "destination": archive_path
            })
        except Exception as e:
            self.log("WARN", f"Could not archive {file_name}: {str(e)}", {}, "FAILED")

        # Update counters
        self.processed_hashes.add(file_hash)
        self.tasks_completed += 1
        self.total_bytes_protected += task["size"]

        return True

    # ─── Safety Guardrails ────────────────────────────────────

    def check_guardrails(self) -> bool:
        """Autonomous safety checks before each task."""
        uptime = (datetime.now() - self.start_time).total_seconds()
        max_runtime = MAX_RUNTIME_MINUTES * 60

        # Time limit
        if uptime > max_runtime:
            self.log("GUARDRAIL", f"Maximum runtime exceeded ({MAX_RUNTIME_MINUTES} min).", {
                "uptime_seconds": uptime,
                "max_seconds": max_runtime
            }, "HALTED")
            return False

        # Task quota
        if self.tasks_completed >= MAX_TASKS_PER_CYCLE:
            self.log("GUARDRAIL", f"Task quota reached ({MAX_TASKS_PER_CYCLE}).", {
                "completed": self.tasks_completed,
                "quota": MAX_TASKS_PER_CYCLE
            }, "HALTED")
            return False

        # Failure threshold
        if self.tasks_failed >= 5:
            self.log("GUARDRAIL", "Too many failures. Halting for safety.", {
                "failures": self.tasks_failed
            }, "HALTED")
            return False

        return True

    # ─── Status Report ────────────────────────────────────────

    def print_status(self):
        """Print a formatted status report."""
        uptime = (datetime.now() - self.start_time).total_seconds()
        print(f"\n  📊 Cycle #{self.cycle_count} | "
              f"✅ {self.tasks_completed} protected | "
              f"⏭️ {self.tasks_skipped} skipped | "
              f"❌ {self.tasks_failed} failed | "
              f"📦 {self.total_bytes_protected:,} bytes secured | "
              f"⏱️ {uptime:.0f}s uptime")

    # ─── Main Loop ────────────────────────────────────────────

    def run(self, single_cycle: bool = False):
        """Run the autonomous decision loop."""
        print("")
        print("  ╔══════════════════════════════════════════════╗")
        print("  ║    🛡️  AEGIS AUTONOMOUS BRAIN — ONLINE       ║")
        print("  ║    Mode: ZK-Sentinel                         ║")
        print("  ║    Challenges: Agent Only + Infrastructure    ║")
        print("  ╚══════════════════════════════════════════════╝")
        print("")

        self.log("STARTUP", "Aegis Autonomous Brain initialized.", {
            "mode": "single_cycle" if single_cycle else "continuous",
            "vault_dir": VAULT_DIR,
            "archive_dir": ARCHIVE_DIR,
            "max_tasks": MAX_TASKS_PER_CYCLE,
            "ts_node": self.ts_node_bin
        })

        while True:
            self.cycle_count += 1
            print(f"\n{'─' * 50}")
            print(f"  🔄 Cycle #{self.cycle_count}")
            print(f"{'─' * 50}")

            # DISCOVER
            items = self.discover()

            if not items:
                print("  💤 No new items found. Sentinel monitoring...")
                if single_cycle:
                    break
                time.sleep(HEARTBEAT_SECONDS)
                continue

            # PLAN
            tasks = self.plan(items)

            # EXECUTE each task
            for task in tasks:
                if not self.check_guardrails():
                    break
                self.execute(task)

            # Status report
            self.print_status()

            # Single cycle mode (for --once flag)
            if single_cycle:
                break

            # Heartbeat sleep
            print(f"\n  ⏳ Next scan in {HEARTBEAT_SECONDS}s...")
            time.sleep(HEARTBEAT_SECONDS)

        # Final summary
        self._print_final_summary()

    def _print_final_summary(self):
        """Print the final run summary."""
        uptime = (datetime.now() - self.start_time).total_seconds()

        print(f"\n{'═' * 50}")
        print("  📋 AEGIS SESSION SUMMARY")
        print(f"{'═' * 50}")
        print(f"  Total Cycles:       {self.cycle_count}")
        print(f"  Tasks Completed:    {self.tasks_completed}")
        print(f"  Tasks Skipped:      {self.tasks_skipped}")
        print(f"  Tasks Failed:       {self.tasks_failed}")
        print(f"  Bytes Protected:    {self.total_bytes_protected:,}")
        print(f"  Runtime:            {uptime:.1f}s")
        print(f"  Log File:           {LOG_FILE}")
        print(f"{'═' * 50}\n")

        self.log("SHUTDOWN", "Aegis session completed.", {
            "cycles": self.cycle_count,
            "completed": self.tasks_completed,
            "skipped": self.tasks_skipped,
            "failed": self.tasks_failed,
            "bytes_protected": self.total_bytes_protected,
            "runtime_seconds": uptime
        })

    # ─── Helpers ──────────────────────────────────────────────

    @staticmethod
    def _hash_file(file_path: str) -> str:
        """Compute SHA-256 hash of a file."""
        sha = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha.update(chunk)
        return sha.hexdigest()


# ─── CLI Entry Point ──────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Aegis Autonomous ZK-Sentinel Brain",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py              Run in continuous monitoring mode
  python main.py --once       Run a single detection cycle
  python main.py --status     Show current agent status
        """
    )
    parser.add_argument('--once', action='store_true',
                        help='Run a single cycle and exit')
    parser.add_argument('--watch', action='store_true',
                        help='Enable continuous daemon monitoring mode')
    parser.add_argument('--status', action='store_true',
                        help='Show current agent status and exit')
    parser.add_argument('--targets', type=str, default='local',
                        help='Comma separated targets (e.g., github,local,gdrive,slack)')

    args = parser.parse_args()
    targets = [t.strip().lower() for t in args.targets.split(',')]

    agent = AegisAgent(targets=targets)

    if args.status:
        agent.print_status()
        return

    agent.run(single_cycle=args.once)


if __name__ == "__main__":
    main()
