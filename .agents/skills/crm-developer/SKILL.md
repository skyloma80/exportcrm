---
name: crm-developer
description: "Developer/DevOps agent for managing feedbacks, code fixes, and CI/CD deployment"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Developer, DevOps, CI/CD, Git, OpenCode]
---

# CRM Developer Agent

The crm-developer agent manages the full lifecycle of user feedbacks (bugs, features, improvements):
1. Monitor feedbacks collection for new/planned items
2. Create git branches for each fix/feature
3. Write task files and delegate to OpenCode for implementation
4. Review changes, ask user for confirmation
5. Git push → CI/CD deployment

## Workflow

```
Feedbacks → Branch → Task File → OpenCode Fix → Review → User Confirm → Git Push → CI/CD
```

## Step-by-Step

### 1. Check Feedbacks

Load crm-feedbacks skill, query for actionable items:

```python
from crm_auth import pb_list

feedbacks = pb_list("feedbacks", "filter=(status='new'||status='planned'||status='in_review')&sort=-created")
```

### 2. Create Branch

```bash
git checkout -b fix/feedback-{FEEDBACK_ID}-{short-title}
```

### 3. Write Task File

Create `.agents/tasks/{feedback_id}.md` with:
- Feedback title, description, type
- Screenshots references
- Specific code changes needed
- File paths to modify

### 4. Delegate to OpenCode

Use the opencode skill to run the fix:

```bash
opencode run "Implement fixes based on .agents/tasks/{feedback_id}.md" -f .agents/tasks/{feedback_id}.md
```

Or delegate via Hermes:

```bash
delegate_task goal="..." context="..." toolsets=['terminal', 'file']
```

### 5. Verify & Report

Verify changes compile/build successfully, then report to user for confirmation.

### 6. User Confirmation

Ask user: "Ready to push and deploy?"

### 7. Push & Deploy

```bash
git add -A
git commit -m "fix: {feedback_title}"
git push origin {branch_name}
# CI/CD auto-deploys via GitHub Actions
```

## Branch Naming Convention

| Feedback Type | Branch Prefix |
|---------------|---------------|
| `bug` | `fix/feedback-{id}-{title}` |
| `feature` | `feat/feedback-{id}-{title}` |
| `improvement` | `chore/feedback-{id}-{title}` |

## Task File Template

```markdown
# Feedback #{id}: {title}
- Type: {type}
- Status: {status}
- Reported by: {user}
- Description: {description}

## Changes Required
{list of specific file changes}

## Verification
- [ ] Build passes (`yarn build`)
- [ ] TypeScript compiles (`tsc --noEmit`)
- [ ] Tests pass (`yarn test`)
```

## CI/CD Pipeline

The project has GitHub Actions configured. After push:
1. GitHub Actions runs build + test
2. If successful, deploys via Docker
3. Monitor at GitHub > Actions tab

## Pitfalls

- Always create a new branch from master/main
- One branch per feedback item
- Never push directly to master
- Always verify builds before pushing
- If OpenCode is not available, implement changes directly
