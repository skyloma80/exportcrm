---
name: crm-tasks
description: "Task management - create, assign, and track tasks within the CRM"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Tasks, Productivity]
depends_on: [crm-auth]
---

# CRM Tasks Skill

Manage tasks within the CRM system - assign tasks to team members and track progress.

## Collection: `tasks`

### Fields

- `title` - Task title
- `description` - Task description
- `assigned_to` - Relation to user
- `project` - Relation to project
- `priority` - low, medium, high, urgent
- `status` - pending, in_progress, completed, cancelled
- `due_date` - Due date
- `completed_at` - Completion timestamp

## Common Operations

### List Tasks
```python
from crm_auth import pb_list
tasks = pb_list("tasks", "sort=-created&expand=assigned_to,project")
```

### Create Task
```python
from crm_auth import pb_create
task = pb_create("tasks", {
    "title": "Prepare quotation for ABC Trading",
    "description": "Create quotation QTN-2024-002 with aluminum profile pricing",
    "assigned_to": user_id,
    "project": project_id,
    "priority": "high",
    "status": "pending",
    "due_date": "2024-01-20"
})
```

### Update Task Status
```python
pb_update("tasks", task_id, {
    "status": "completed",
    "completed_at": "2024-01-18T15:30:00Z"
})
```
