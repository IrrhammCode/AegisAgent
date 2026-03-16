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


# ─── Autonomous Agent Class ──────────────────────────────────

class AegisAgent:
    """The autonomous decision-making brain of the Aegis ZK-Sentinel."""

    def __init__(self):
        self.start_time = datetime.now()
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

    # ─── Stage 1: DISCOVER ────────────────────────────────────

    def discover(self) -> list:
        """Autonomously scan the vault directory for new data assets."""
        if not os.path.exists(VAULT_DIR):
            self.log("DISCOVER", "Vault directory missing.", {"path": VAULT_DIR}, "ERROR")
            return []

        all_files = []
        for root, _, files in os.walk(VAULT_DIR):
            for f in files:
                if f.startswith('.'):
                    continue  # Skip hidden files
                full_path = os.path.join(root, f)
                file_hash = self._hash_file(full_path)

                # Skip already-processed files (deduplication)
                if file_hash in self.processed_hashes:
                    continue

                all_files.append({
                    "file": f,
                    "path": full_path,
                    "size": os.path.getsize(full_path),
                    "hash": file_hash
                })

        self.log("DISCOVER", f"Found {len(all_files)} new item(s) in vault.", {
            "vault_path": VAULT_DIR,
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
                self.log("ERROR", f"No structured output from orchestrator for {file_name}", {
                    "stdout_tail": stdout[-500:] if stdout else "",
                    "stderr_tail": stderr[-500:] if stderr else ""
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
    parser.add_argument('--status', action='store_true',
                        help='Show current agent status and exit')

    args = parser.parse_args()

    agent = AegisAgent()

    if args.status:
        agent.print_status()
        return

    agent.run(single_cycle=args.once)


if __name__ == "__main__":
    main()
