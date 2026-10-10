# AUTO_KILLER Plugin Migration 3.0

This directory is the source package for migrating the legacy "역병킬러" Custom GPT to a ChatGPT skill-only plugin without changing the ZETA-side workflow.

## Goal

Keep AUTO_KILLER responsible for:

- collecting ZETA content
- building job payloads
- opening a fresh ChatGPT conversation
- sending the job
- detecting the completed response
- returning the result to ZETA

Move the legacy Custom GPT behavior into a reusable plugin skill.

## Target architecture

```
ZETA
  -> AUTO_KILLER
  -> ChatTargetAdapter
       1. plugin
       2. legacyCustomGPT
       3. plainChatFallback
  -> ChatGPT
  -> AUTO_KILLER response transport
  -> ZETA
```

Production 2.25.x must remain unchanged until plugin mode passes review / generate / summarize regression tests.

## Plugin shape

Initial migration is skill-only. No MCP app or API key is required.

- `SKILL.md`: routing and invariant rules
- `references/common-rp-contract.md`: shared RP/output contract
- `references/review-zeta.md`: review workflow
- `references/generate-zeta.md`: next-scene generation workflow
- `references/summarize-zeta.md`: summary workflow
- `references/transport-handshake.md`: AUTO_KILLER/plugin handshake contract

## Important

RP results must continue to use ChatGPT's native Writing Block UI. Do not replace Writing Blocks with ordinary prose or fenced code blocks.

The current Custom GPT remains the production target while this branch is under development.
