#!/usr/bin/env bash
# crm-dev-task.sh - Create a task file from a feedback record
# Usage: ./crm-dev-task.sh <feedback_id>
FEEDBACK_ID="${1:?Usage: $0 <feedback_id>}"
TASK_DIR=".agents/tasks"
mkdir -p "$TASK_DIR"

# Get feedback from PocketBase
FEEDBACK_JSON=$(python3 -c "
from crm_auth import get_record, pb_list
import json, sys
f = get_record('feedbacks', '$FEEDBACK_ID', 'user')
print(json.dumps(f))
")

echo "$FEEDBACK_JSON" | python3 -c "
import json, sys
f = json.load(sys.stdin)
task = f'''# Feedback #{f['id']}: {f.get('title','')}

- **Type**: {f.get('type','')}
- **Status**: {f.get('status','')}
- **Description**: {f.get('description','')}
- **Screenshots**: {f.get('screenshots','')}

## Changes Required

TODO: Define specific code changes

## Verification
- [ ] Build passes
- [ ] TypeScript compiles
- [ ] Tests pass
'''
with open('.agents/tasks/${FEEDBACK_ID}.md', 'w') as fh:
    fh.write(task)
print(f'Task file created: .agents/tasks/${FEEDBACK_ID}.md')
"
