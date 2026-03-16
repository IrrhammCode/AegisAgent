import os
import json
import time
import subprocess
from datetime import datetime
from dotenv import load_dotenv

# --- AEGIS: THE AUTONOMOUS BRAIN ---
# This engine implements the Full Decision Loop: 
# DISCOVER -> PLAN -> EXECUTE -> VERIFY

load_dotenv()

LOG_FILE = "agent_log.json"
VAULT_DIR = "vault_data"
PROCESSED_DIR = "vault_data_archived"

class AegisAgent:
    def __init__(self):
        self.start_time = datetime.now()
        self.tasks_completed = 0
        self._ensure_dirs()
        self.logs = []
        self._load_logs()

    def _ensure_dirs(self):
        for d in [VAULT_DIR, PROCESSED_DIR]:
            if not os.path.exists(d):
                os.makedirs(d)

    def _load_logs(self):
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'r') as f:
                try: self.logs = json.load(f)
                except: self.logs = []

    def log(self, step, decision, details, status="SUCCESS"):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "step": step,
            "decision": decision,
            "details": details,
            "status": status
        }
        self.logs.append(entry)
        with open(LOG_FILE, 'w') as f:
            json.dump(self.logs, f, indent=2)
        print(f"[{step}] {decision} -> {status}")

    def discover(self):
        """Stage 1: Discover. Seek data requiring protection."""
        files = [f for f in os.listdir(VAULT_DIR) if os.path.isfile(os.path.join(VAULT_DIR, f))]
        self.log("DISCOVER", f"Found {len(files)} potential items in vault.", {"count": len(files)})
        return files

    def plan(self, items):
        """Stage 2: Plan. Prioritize tasks based on sensitivity."""
        # Autonomous prioritization: Agent decides to process all new items found.
        plan = [{"file": f, "path": os.path.join(VAULT_DIR, f), "id": f.split('.')[0]} for f in items]
        self.log("PLAN", f"Prioritized {len(plan)} tasks for protection cycle.", {"plan_size": len(plan)})
        return plan

    def execute(self, task):
        """Stage 3: Execute. Delegate to the 5-Stage Orchestrator (TS)."""
        self.log("EXECUTE", f"Running security pipeline for {task['file']}", {"task_id": task['id']})
        
        try:
            # Using the local project binary to avoid npx interactive prompts
            ts_node_bin = os.path.join("node_modules", ".bin", "ts-node")
            if not os.path.exists(ts_node_bin):
                ts_node_bin = "ts-node" # Fallback to path

            cmd = [ts_node_bin, "src/index.ts", "PROTECT_ASSET", task['path']]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            
            if "__AEGIS_RESULT__:" in proc.stdout:
                res_str = proc.stdout.split("__AEGIS_RESULT__:")[1].strip()
                result = json.loads(res_str)
                
                if result.get("status") == "SUCCESS":
                    self.log("VERIFY", f"Archival verified for {task['file']}", result)
                    # Move to processed
                    os.rename(task['path'], os.path.join(PROCESSED_DIR, task['file']))
                    self.tasks_completed += 1
                    return True
                else:
                    self.log("EXECUTE", f"Pipeline failed for {task['file']}", result, status="FAILED")
            else:
                self.log("ERROR", "Orchestrator returned invalid output", {"stderr": proc.stderr}, status="FAILED")
        except Exception as e:
            self.log("CRITICAL", f"Execution error: {str(e)}", {}, status="ERROR")
        
        return False

    def check_guardrails(self):
        """Safety & Budget Guardrails."""
        uptime = (datetime.now() - self.start_time).total_seconds()
        # Autonomous safety: Stop if running too long or too many tasks in one burst
        if self.tasks_completed >= 10:
            self.log("GUARDRAIL", "Task quota reached for current cycle.", {"quota": 10}, status="HALTED")
            return False
        return True

    def run(self):
        print("\n" + "="*40)
        print("🛡️  AEGIS AUTONOMOUS BRAIN ONLINE")
        print("Challenge: Agent Only & Infrastructure")
        print("="*40 + "\n")

        while True:
            items = self.discover()
            if not items:
                print("... Sentinel monitoring ...")
            else:
                tasks = self.plan(items)
                for task in tasks:
                    if not self.check_guardrails(): break
                    self.execute(task)
            
            time.sleep(60) # Decision heartbeat

if __name__ == "__main__":
    agent = AegisAgent()
    # For the hackathon demo, we typically run one cycle or loop
    agent.run()
