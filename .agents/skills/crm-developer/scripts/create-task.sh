#!/usr/bin/env bash
# crm-dev-task.sh - Create a task file from a customer_tracking record
# Usage: ./crm-dev-task.sh <tracking_id>
TRACKING_ID="${1:?Usage: $0 <tracking_id>}"
TASK_DIR=".agents/tasks"
mkdir -p "$TASK_DIR"

# Get tracking record from PocketBase
TRACKING_JSON=$(python3 -c "
from crm_auth import get_record, pb_list
import json, sys
f = get_record('customer_tracking', '$TRACKING_ID')
print(json.dumps(f))
")

echo "$TRACKING_JSON" | python3 -c "
import json, sys
f = json.load(sys.stdin)
task = f'''# Task #{f['id']}: {f.get('title','')}

- **Description**: {f.get('description','')}
- **Status**: {f.get('status','')}
- **Notes**: {f.get('notes','')}

## Changes Required

TODO: Define specific code changes

## Verification
- [ ] Build passes
- [ ] TypeScript compiles
- [ ] Tests pass
'''
with open('.agents/tasks/${TRACKING_ID}.md', 'w') as fh:
    fh.write(task)
print(f'Task file created: .agents/tasks/${TRACKING_ID}.md')
"
