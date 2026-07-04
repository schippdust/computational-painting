# Development Team

Orchestrate three specialized agents in parallel to assess a request, then synthesize their findings into a sequential sprint plan saved to `.claude/plans/`.

**Invoke when:** the user asks the "Development Team" or "team" to assess, plan, or review something — including explicit "Code Review" requests.

---

## Team Roles

| Agent | Lens |
|---|---|
| **Software Engineer** | Code quality, modularity, naming, dead code, redundancy, TypeScript best practices |
| **Computational Designer** | Aesthetic intent, visual output, how classes/physics/rendering serve the art-making workflow |
| **Architect** | Big-picture structural integrity, art/code balance, cross-cutting concerns, pragmatic judgment |

---

## Orchestration Flow

### Phase 1 — Parallel Assessment

Spawn all three agents simultaneously in a single message (three Agent tool calls). Each agent receives a self-contained prompt — they have no shared context from this conversation.

Include the full `.claude/rules/` context summary in every agent prompt (copy the relevant facts inline; agents start cold). Tell each agent to also read the rules files directly.

---

#### Agent 1: Software Engineer

```
You are a Software Engineer assessing a generative art TypeScript/Vue 3/p5.js codebase.

CODEBASE CONTEXT — read these files before reviewing:
- .claude/rules/architecture.md  (tech stack, data flow, drawing philosophy)
- .claude/rules/conventions.md   (TypeScript/Vue style, naming, JSDoc, method chaining)
- .claude/rules/classes.md       (class hierarchy: Core, Geometry, Generators, MarkMakingEntities, EntityManagement, Rendering)
- .claude/rules/p5-patterns.md   (p5 instance mode, canvas parameters pattern, coordinate system)
- .claude/rules/p5-rendering.md  (renderer folder layout, distance scaling, projection)
- .claude/rules/p5-vehicles.md   (physics pipeline order, springs, vehicle lifetime, octree)

REQUEST: [INSERT USER REQUEST]

YOUR LENS: Code quality, modularity, naming conventions, dead code, redundancy, TypeScript best practices, class and interface design, import hygiene, method chaining consistency, JSDoc completeness.

[CODE REVIEW ONLY]: Run `git ls-files` to list all tracked source files. Run `git log --oneline -20` and `git diff --name-only HEAD~10..HEAD` to identify recently modified files — prioritize those. Read all files under src/. Skip node_modules, dist, output.

INSTRUCTIONS: Produce a structured list of findings and recommendations ONLY — do not implement anything. For each finding:
- **What**: specific file, class, function, or pattern
- **Why**: the problem and its impact
- **Effort**: small / medium / large

End your response with a "## Themes" section naming the 2-3 most important systemic issues you found.
```

---

#### Agent 2: Computational Designer

```
You are a Computational Designer assessing a generative art TypeScript/Vue 3/p5.js codebase.

CODEBASE CONTEXT — read these files before reviewing:
- .claude/rules/architecture.md  (drawing philosophy: accumulating marks, not real-time rendering)
- .claude/rules/classes.md       (class hierarchy: vehicles, geometry, generators, renderers)
- .claude/rules/p5-patterns.md   (canvas structure, coordinate system, persistent canvas philosophy)
- .claude/rules/p5-rendering.md  (GeometryRenderers, VehicleRenderers, PhysicsRenderers, distance scaling)
- .claude/rules/p5-vehicles.md   (physics pipeline, force ordering, springs, vehicle lifetime, flocking)

REQUEST: [INSERT USER REQUEST]

YOUR LENS: How well do the Vehicle physics, geometry primitives, renderer hierarchy, and canvas iteration approach serve the goal of making generative art? Is the class API composable enough to express new visual behaviors? Are there missing abstractions that would unlock aesthetic possibilities? Are the canvas components using the tools idiomatically? Does the accumulating-marks philosophy stay intact?

[CODE REVIEW ONLY]: Run `git ls-files` to list all tracked source files. Run `git log --oneline -20` and `git diff --name-only HEAD~10..HEAD` to identify recently modified files. Read all source files under src/. Pay special attention to canvas components (src/components/*Canvas.vue) and class files (src/classes/).

INSTRUCTIONS: Produce a structured list of findings and recommendations ONLY — do not implement anything. For each finding:
- **What**: specific file, class, behavior, or missing abstraction
- **Why**: how it affects visual output, expressiveness, or the iterative drawing workflow
- **Effort**: small / medium / large

End your response with a "## Themes" section naming the 2-3 most important design-level opportunities.
```

---

#### Agent 3: Architect

```
You are a Software Architect assessing a generative art TypeScript/Vue 3/p5.js codebase.

CODEBASE CONTEXT — read these files before reviewing:
- .claude/rules/architecture.md  (tech stack, data flow, Pinia store as Vue/p5 bridge)
- .claude/rules/conventions.md   (TypeScript/Vue conventions, factory patterns, method chaining)
- .claude/rules/classes.md       (full class hierarchy and extension patterns)
- .claude/rules/p5-patterns.md   (p5 instance mode, canvas parameter pattern, persistent canvas)
- .claude/rules/p5-rendering.md  (renderer design pattern, all renderers delegate to GeometryRenderers)
- .claude/rules/p5-vehicles.md   (physics pipeline, springs, vehicle lifetime, octree spatial index)

REQUEST: [INSERT USER REQUEST]

YOUR LENS: Overall structural integrity, tech-stack fit, data-flow correctness, cross-cutting concerns. Stay pragmatic — this is a generative art tool, not enterprise software. Over-engineering is a real failure mode. Flag things that will compound as the codebase grows: structural drift, missing invariants, layering violations, tight coupling between Vue and p5. Call out anything that threatens the core purpose: an accumulating-mark canvas driven by physics agents.

[CODE REVIEW ONLY]: Run `git ls-files` to list all tracked source files. Run `git log --oneline -20` and `git diff --name-only HEAD~10..HEAD` to identify recently modified files. Read all source files under src/. Focus on the overall shape — patterns, anti-patterns, structural drift, layering.

INSTRUCTIONS: Produce a structured list of findings and recommendations ONLY — do not implement anything. For each finding:
- **What**: specific concern (may be cross-file or systemic)
- **Why**: structural or strategic impact
- **Effort**: small / medium / large

End your response with a "## Themes" section naming the 2-3 most important architectural concerns.
```

---

### Phase 2 — Architect Prioritization Pass

After all three Phase 1 agents complete, spawn **one additional Architect agent** whose sole job is to synthesize and prioritize across all three plans. Pass it the complete output of all three Phase 1 agents:

```
You are a Software Architect making a prioritization pass on three disciplinary assessments of a generative art codebase.

Below are the findings from three parallel reviewers. Your job is to produce a prioritized synthesis for the orchestrator who will write the final sprint plan — not to add new findings.

--- SOFTWARE ENGINEER FINDINGS ---
[paste full SE output]

--- COMPUTATIONAL DESIGNER FINDINGS ---
[paste full CD output]

--- ARCHITECT FINDINGS ---
[paste full AR output]

For every recommendation across all three plans, classify it as one of:
- **MUST INCLUDE** — high value, clear benefit, no significant trade-offs
- **INCLUDE WITH CAVEATS** — good idea, but note the specific risk or scope limit
- **DEPRIORITIZE** — low value-to-effort, or conflicts with art-making pragmatism
- **SKIP** — not worth doing in this codebase

Group output by tier (MUST → INCLUDE → DEPRIORITIZE → SKIP), not by source agent. Where multiple agents agree on something, flag it — agreement signals importance. Where agents conflict, name the tension and explain your call. Keep it concise — this is a brief for the orchestrator, not an essay.
```

---

### Phase 3 — Synthesize and Save

As the orchestrator, combine the Architect's prioritization with all three original plans and write the final sprint plan.

**Sprint ordering rules:**
- Each sprint = one concern or tightly connected group
- Order sprints so earlier ones don't create blockers for later ones
- Foundation/structural work comes before feature-level work
- MUST INCLUDE items always appear; use judgment on INCLUDE WITH CAVEATS; omit DEPRIORITIZE/SKIP

**Self-contained sprint requirement:** A fresh agent with zero conversation history must be able to open this plan, read a single sprint, and execute it without needing to re-read any agent output. Each task must include specific file paths, class/function names, and enough context to act.

**Sprint format:**

```markdown
# [Request Title] — Development Plan
*Generated: YYYY-MM-DD*
*Request: [original user request verbatim]*

## Summary
[2-3 sentences: what this plan addresses and the expected outcome]

## Sprint 1 — [Descriptive Focus Area Title]
**Goal:** [one sentence stating what done looks like]
**Rationale:** [why this sprint comes first]
**Sources:** [SE] / [CD] / [AR] — which agents flagged this

### Tasks
- [ ] [Specific task description]
  - File: `src/path/to/file.ts` (lines ~N if relevant)
  - Change: [what specifically to do]
  - Context: [any non-obvious constraint or invariant the executing agent needs to know]

- [ ] [Next task...]

## Sprint 2 — [Descriptive Focus Area Title]
...
```

**File naming:** `.claude/plans/<kebab-summary>-YYYY-MM-DD.md`
Use today's date from your context. Use a short kebab slug that captures the request (e.g. `code-review-2026-07-04.md`, `spring-grid-refactor-2026-07-04.md`).

**After saving:** report the file path to the user and give a one-paragraph summary of what the plan covers — sprint titles, main themes, and total task count.

---

## Code Review Mode

When the user requests a **Code Review** from the Development Team, each agent's `[CODE REVIEW ONLY]` instructions apply. Specifically, each agent must:

1. Run `git ls-files` — all tracked source files (respects .gitignore automatically)
2. Run `git log --oneline -20` — recent commit history
3. Run `git diff --name-only HEAD~10..HEAD` — files touched in recent work
4. Read every file under `src/`, prioritizing recently modified ones
5. Review through their disciplinary lens and report file-specific findings

The synthesized sprint plan should organize findings by **theme or concern area** rather than file-by-file. File-by-file plans don't sequence well and are harder for an executing agent to work through efficiently.
