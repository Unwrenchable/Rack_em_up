---
name: rackup-lite
description: Lightweight guidance for Rack_em_up backend tasks.
---

# Rack_em_up Lite Skill

## Instructions
Provide minimal, fast, low-memory guidance.

Agents using this Skill must:
- Respect existing enums and entities.
- Use InjectRepository or DataSource.getRepository.
- Avoid loading full tournament logic.
- Only assist with small, isolated fixes or explanations.

## Capabilities
- Explain bracket logic (single, double, swiss) without generating full implementations.
- Help debug small TypeScript or NestJS errors.
- Provide small code snippets only when needed.
- Avoid scanning the entire project.

## Examples
- “Explain how losers bracket works.”
- “Fix this TypeScript error.”
- “Show how to inject a repository.”
