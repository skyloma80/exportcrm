# CRM Developer Agent

## TL;DR
```
1. pb_list("feedbacks", "filter=(status='new'||status='planned')")
2. git checkout -b fix/feedback-{id}
3. Create .agents/tasks/{id}.md
4. opencode run -f .agents/tasks/{id}.md
5. yarn build && yarn test
6. Tell user → confirm → git push
```

## Task File Example

See `.agents/tasks/` for examples.

## OpenCode Reference

For interactive sessions: `opencode` (needs pty=true)
For one-shot: `opencode run '...'`
