---
name: github-issues
description: Manage GitHub issues using the `gh` CLI. Use when the user asks to list, view, create, edit, close, reopen, comment on, or search GitHub issues.
tools: Bash
---

# GitHub Issues Skill

This project's repository is `benchmark-action/github-action-benchmark`. Always use `-R benchmark-action/github-action-benchmark` unless the user explicitly specifies a different repo.

## Common Operations

### List issues
```bash
gh issue list -R benchmark-action/github-action-benchmark
gh issue list -R benchmark-action/github-action-benchmark --state all
gh issue list -R benchmark-action/github-action-benchmark --state closed
gh issue list -R benchmark-action/github-action-benchmark --label "bug"
gh issue list -R benchmark-action/github-action-benchmark --assignee "@me"
gh issue list -R benchmark-action/github-action-benchmark --author monalisa
gh issue list -R benchmark-action/github-action-benchmark --search "error no:assignee"
gh issue list -R benchmark-action/github-action-benchmark --limit 100
gh issue list -R benchmark-action/github-action-benchmark --json number,title,state,labels,url
```

### View an issue
```bash
gh issue view 123 -R benchmark-action/github-action-benchmark
gh issue view 123 -R benchmark-action/github-action-benchmark --comments
gh issue view 123 -R benchmark-action/github-action-benchmark --json title,body,comments,labels,assignees,state,url
```

### Create an issue
```bash
gh issue create -R benchmark-action/github-action-benchmark --title "Title" --body "Body"
gh issue create -R benchmark-action/github-action-benchmark --title "Bug" --label "bug" --assignee "@me"
gh issue create -R benchmark-action/github-action-benchmark --web
```

### Edit an issue
```bash
gh issue edit 123 -R benchmark-action/github-action-benchmark --title "New title"
gh issue edit 123 -R benchmark-action/github-action-benchmark --body "Updated body"
gh issue edit 123 -R benchmark-action/github-action-benchmark --add-label "priority:high" --remove-label "triage"
gh issue edit 123 -R benchmark-action/github-action-benchmark --add-assignee "@me"
```

### Close / Reopen
```bash
gh issue close 123 -R benchmark-action/github-action-benchmark
gh issue close 123 -R benchmark-action/github-action-benchmark --reason "not planned"
gh issue reopen 123 -R benchmark-action/github-action-benchmark
```

### Comment on an issue
```bash
gh issue comment 123 -R benchmark-action/github-action-benchmark --body "My comment"
```

### Pin / Unpin
```bash
gh issue pin 123 -R benchmark-action/github-action-benchmark
gh issue unpin 123 -R benchmark-action/github-action-benchmark
```

## Workflow

1. **Determine the intent** from the user's request (list, view, create, edit, close, comment, etc.)
2. **Always pass** `-R benchmark-action/github-action-benchmark` unless the user says otherwise
3. **Run the appropriate `gh issue` command** using the Bash tool
4. **Present the output** clearly; for `--json` output, summarize the relevant fields rather than dumping raw JSON

## Tips

- Issue numbers and URLs are both valid arguments
- Use `--json fields` + `--jq expression` for precise filtering
- `gh issue status -R benchmark-action/github-action-benchmark` shows issues relevant to you
