# AUTO_KILLER Plugin Migration 3.0

This directory mirrors the actual private ChatGPT plugin source used for the 역병킬러 migration.

## Current plugin

- Backend ID: `plugins_6aca3662eee4819184ade9b529406401`
- Display name: `역병킬러`
- Package name: `yeokbyeong-killer`
- Current migrated version: `0.2.2`
- Scope: private personal plugin
- Shape: skill-only, no MCP app, no API key

The files under `plugin/plugin.json`, `plugin/.codex-plugin/`, and `plugin/skills/` are kept in sync with the actual Plugin Creator release.

## What moved from the Custom GPT

The plugin skill preserves the RP behavior contract, including:

- native Writing Block output for RP results
- `@인물:` speech-bubble tags
- literal `\*지문\*` narration escaping
- narrator `@:` absorption
- tone / rough speech / honorific / relationship preservation
- current-tense cleanup and Korean sentence polish
- 짧출 / 엔터 / 앵무새 / 말풍 behavior
- 수정 / 정리 / 합치기 / 나누기 / 이어쓰기 / 새 장면 생성
- AUTO_KILLER review / generate / summarize routing
- summary character-limit behavior
- safe partial summarization instead of unnecessary all-or-nothing stopping

## AUTO_KILLER 3.0 transport

The migration branch adds a `ChatTargetAdapter`-style routing layer:

1. `plugin`
2. `plainChatFallback`
3. `legacyCustomGPT`

Plugin mode opens a fresh ordinary temporary ChatGPT conversation. Before any real ZETA payload is submitted, AUTO_KILLER sends a plugin-specific challenge and requires the private response defined only in the plugin skill.

Current handshake:

- challenge: `AK_PLUGIN_V1_CHALLENGE:7419`
- expected response: `AK_PLUGIN_V1_OK:Q9M4`

If that response is not observed, AUTO_KILLER does **not** send the raw RP prompt as if the plugin were active. It switches to the embedded full-contract fallback.

The old Custom GPT adapter remains available for rollback during the test period.

## Production safety

Production `main` remains on 2.25.5.9 until the migration branch passes the regression matrix.

Do not merge the branch merely because the plugin package validates. Transport, Writing Block extraction, Android/iOS return flow, and all three AUTO_KILLER operations must pass first.


## Exact legacy-instruction migration

The current plugin release stores the uploaded legacy Custom GPT instruction file verbatim at `skills/base/references/legacy-instructions-verbatim.md`.

The runtime Skill treats that file as the single authoritative RP ruleset and does not replace it with reconstructed summary rules. The previous reconstructed RP reference files were removed from the plugin release to avoid conflicts.

The uploaded source and the plugin reference were verified as an exact string match before this release was finalized.
