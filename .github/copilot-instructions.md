# System Workflow Instructions

## Scope And Priority

- These are workspace-level default instructions for all requests in this repository.
- Direct user instructions in chat override this file.

## Intent Of The Using-Superpowers Workflow

- The primary intent is disciplined execution: choose the right skill before taking action.
- Skills are not optional suggestions; they define how work should be performed.
- User intent defines what to do, while skills define how to do it.
- When uncertainty remains after skill use and local context review, expand context with authoritative external references.

## Mandatory Skill-First Workflow

- Before any response or action, check whether any workspace skill might apply.
- If there is even a small chance a skill is relevant, invoke that skill first.
- Do not ask clarifying questions, inspect files, propose plans, or run commands before the skill check.
- If the selected skill is not relevant after invocation, continue normally.
- If a user explicitly requests a skill, invoke that skill first.
- Re-read the skill source when used; do not rely on memory of old versions.

## Skill Discovery And Invocation

- Discover skills from:
  - `.github/skills/<skill-name>/SKILL.md`
  - `.agents/skills/<skill-name>/SKILL.md`
- Follow the invoked skill instructions exactly.
- If a skill is user-invocable, use slash invocation.

## Execution Order When Multiple Skills Apply

- Use process skills first (for example: brainstorming, debugging).
- Use implementation skills second (for example: frontend, domain, or platform skills).

## Operating Rules After Skill Selection

- Announce which skill is being used and why.
- If the skill includes a checklist, create and track todos for each checklist item.
- Treat rigid workflow skills as strict procedures.
- Treat flexible pattern skills as principles to adapt to context.
- If multiple relevant skills exist, start with process skills and then apply implementation skills.
- Re-evaluate skill relevance at each major phase transition (discovery, implementation, validation).

## Best-Possible Skill Usage Standard

- Apply the full workflow of the selected skill, not only isolated tips.
- Prefer deterministic skill steps (checklists, validation, ordering) over ad-hoc execution.
- If a chosen skill is clearly not applicable after invocation, state this and switch to a better-fit skill.
- Keep outputs aligned to the skill's quality bar, including required validation and verification steps.

## Uncertainty Handling And External Research

- If confidence is low after skill invocation and repository inspection, proactively gather external context.
- Use internet or browser tools to fetch current, authoritative references before making uncertain decisions.
- Prefer official documentation, framework references, standards, and reputable technical sources.
- Use external findings to validate assumptions, reduce hallucination risk, and improve implementation quality.
- If external access is unavailable, explicitly note that limitation and proceed with the best local evidence.

## Anti-Rationalization Guardrails

- Do not skip skill checks because a task looks simple.
- Do not gather context before skill checks.
- Do not rely on memory of a skill; read the current skill definition.
- Do not perform "just one quick action" before checking skills.

## Clarification About "What" Vs "How"

- User requests define what to build or change.
- Skills define how to execute the work.

## Subagent Exception

- If operating as a dispatched subagent for a narrowly scoped task, do not force this startup workflow unless explicitly requested.
