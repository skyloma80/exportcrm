---
name: crm-feedbacks
description: "User feedback management - bugs, features, improvements reported by users"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Feedback, Bugs, Features]
depends_on: [crm-auth]
---

# CRM Feedbacks Skill

Manage user feedback submissions including bugs, feature requests, and improvements.

## Collection: `feedbacks`

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `user` | Relation | Reporting user |
| `type` | Select | bug, feature, improvement, other |
| `title` | Text | Short summary |
| `description` | Text | Detailed description (max 5000 chars) |
| `screenshots` | JSON | Array of screenshot URLs/paths |
| `status` | Select | new, in_review, planned, in_progress, completed, declined |
| `admin_response` | Text | Admin response message |
| `responded_by` | Relation | Admin who responded |
| `responded_at` | Date | When admin responded |

### Status Flow

```
new → in_review → planned → in_progress → completed
               ↘ declined
```

## Common Operations

### List All Feedbacks
```python
from crm_auth import pb_list
feedbacks = pb_list("feedbacks", "sort=-created&expand=user,responded_by")
```

### Filter by Type
```python
# Bugs only
bugs = pb_list("feedbacks", "filter=(type='bug')&sort=-created")

# Features only
features = pb_list("feedbacks", "filter=(type='feature')&sort=-created")

# New items needing attention
new = pb_list("feedbacks", "filter=(status='new')&sort=-created")
```

### Get Feedback Details
```python
from crm_auth import pb_get
fb = pb_get("feedbacks", feedback_id, expand="user,responded_by")
print(f"Type: {fb.get('type')}")
print(f"Title: {fb.get('title')}")
print(f"Description: {fb.get('description')}")
print(f"Status: {fb.get('status')}")
print(f"User: {fb.get('expand',{}).get('user',{}).get('name')}")
```

### Update Feedback Status
```python
from crm_auth import pb_update

# Mark as in review
pb_update("feedbacks", feedback_id, {
    "status": "in_review"
})

# Respond and mark as planned
pb_update("feedbacks", feedback_id, {
    "status": "planned",
    "admin_response": "We've reviewed your request and added it to our roadmap.",
    "responded_by": admin_user_id,
    "responded_at": "2024-01-15T10:00:00Z"
})

# Mark as completed
pb_update("feedbacks", feedback_id, {
    "status": "completed",
    "admin_response": "This feature has been implemented and deployed.",
    "responded_by": admin_user_id,
    "responded_at": "2024-01-20T10:00:00Z"
})
```

### Create Feedback
```python
from crm_auth import pb_create
feedback = pb_create("feedbacks", {
    "user": user_id,
    "type": "bug",
    "title": "PI document download fails for orders with special characters",
    "description": "When the customer name contains special characters (e.g., &), the PI Excel download returns a 500 error.",
    "screenshots": ["/disk/path/screenshot-2024-01-15.png"],
    "status": "new"
})
```

## Developer Workflow

This skill is used by the crm-developer agent:

1. Poll `feedbacks` collection for items with status `new` or `planned`
2. Review the feedback details and screenshots
3. Create a git branch for the fix
4. Write a task file at `.agents/tasks/{id}.md`
5. Use OpenCode to implement changes
6. Update feedback status to `in_progress`
7. After user confirmation, change to `completed`

## Developer Prompt Template

When delegating to OpenCode:

```
Fix this bug: {title}
Description: {description}
Screenshots: {screenshots}

Changes needed in: {file_paths}

Verification: yarn build && yarn test
```
