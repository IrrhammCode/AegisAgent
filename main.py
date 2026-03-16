import os
import json
import time
import subprocess
import argparse
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
LOG_FILE = "agent_log.json"
MANIFEST_FILE = "agent.json"
VAULT_DIR = "./vault_data"
MAX_COMPUTE_BUDGET = float(os.getenv("MAX_COMPUTE_BUDGET", 10.0))

# --- State Management ---
class AegisState:
    def __init__(self):
        self.total_gas_spent = 0.0
        self.tasks_completed = 0
        self.start_time = datetime.now()

state = AegisState()

def log_action(step, decision, details, status="SUCCESS"):
    """Appends a structured log entry to agent_log.json."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "step": step,
        "decision": decision,
        "details": details,
        "status": status
    }
    
    logs = []
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r") as f:
            try:
                logs = json.load(f)
            except:
                pass
                
    logs.append(entry)
    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=2)
    
    print(f"[{entry['timestamp']}] {step}: {decision} -> {status}")

def discover():
    """Phase 1: Discover data requiring protection."""
    log_action("DISCOVER", "Scanning vault_data directory", {"path": VAULT_DIR})
    
    if not os.path.exists(VAULT_DIR):
        os.makedirs(VAULT_DIR)
        # Create a dummy file for the demo if empty
        with open(os.path.join(VAULT_DIR, "user_identity_shard_1.json"), "w") as f:
            json.dump({"owner": "0x123", "data": "sensitive_profile_data"}, f)
            
    files = [f for f in os.listdir(VAULT_DIR) if os.path.isfile(os.path.join(VAULT_DIR, f))]
    log_action("DISCOVER", f"Found {len(files)} files", {"files": files})
    return files

def plan(files):
    """Phase 2: Plan which files to archive based on budget and priority."""
    tasks = []
    for f in files:
        # Simple policy: Archive everything not already logged as archived
        file_path = os.path.join(VAULT_DIR, f)
        tasks.append({"file": f, "path": file_path, "priority": "HIGH"})
        
    log_action("PLAN", f"Constructed execution plan for {len(tasks)} tasks", {"tasks": tasks})
    return tasks

def execute(task):
    """Phase 3: Execute the infrastructure archival via the TS orchestrator."""
    log_action("EXECUTE", f"Protecting digital rights for {task['file']}", task)
    
    try:
        # Call the TypeScript orchestrator
        # npx ts-node src/index.ts <task_type> <data_path>
        cmd = ["npx", "ts-node", "src/index.ts", "SECURE_ARCHIVE", task["path"]]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if "__AEGIS_RESULT__:" in result.stdout:
            result_json_str = result.stdout.split("__AEGIS_RESULT__:")[1].strip()
            result_data = json.loads(result_json_str)
            
            if result_data["status"] == "SUCCESS":
                log_action("EXECUTE", f"Task Completed: {task['file']}", result_data)
                return True
            else:
                log_action("EXECUTE", f"Task Failed: {task['file']}", result_data, status="FAILED")
        else:
            log_action("EXECUTE", "Unexpected subprocess output", {"stdout": result.stdout, "stderr": result.stderr}, status="FAILED")
            
    except Exception as e:
        log_action("EXECUTE", f"Execution error: {str(e)}", task, status="ERROR")
    
    return False

def verify():
    """Phase 4: Verify overall system state and budget."""
    log_action("VERIFY", "Audit system integrity", {"uptime": str(datetime.now() - state.start_time)})
    return True

def main_loop():
    print("=== Aegis Autonomous Sentinel Initialized ===")
    print("Challenge: Agent Only | Track: Infrastructure & Digital Rights")
    print("Stack: ERC-8004 + Noir ZK + Arweave (Irys)")
    print("============================================\n")
    
    while True:
        # 1. Discover
        files = discover()
        
        # 2. Plan
        tasks = plan(files)
        
        # 3. Execute
        for task in tasks:
            # Check budget awareness (Guardrail)
            if state.tasks_completed >= 5: # Simulating budget limit for demo
                log_action("GUARDRAIL", "Monthly compute budget reached", {"budget": MAX_COMPUTE_BUDGET})
                break
                
            success = execute(task)
            if success:
                state.tasks_completed += 1
                # Remove file after successful archival to prevent re-processing in loop
                # In real life, we would move it to an 'archived' folder
                os.remove(task["path"])
        
        # 4. Verify
        verify()
        
        print("\n[SENTINEL] Decision loop complete. Sleeping for 60 seconds...\n")
        time.sleep(60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aegis Autonomous Agent")
    parser.add_argument("--once", action="store_true", help="Run a single decision loop and exit")
    args = parser.parse_known_args()[0]
    
    if args.once:
        files = discover()
        tasks = plan(files)
        if tasks:
            execute(tasks[0])
        verify()
    else:
        main_loop()
