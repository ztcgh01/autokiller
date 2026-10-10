# AUTO_KILLER 3.0 Plugin Migration Design

## Stable production baseline

Production remains 2.25.5.9 during development.

The current dedicated Custom GPT URL remains untouched on main until plugin mode passes regression testing.

## Adapter model

Introduce a `ChatTargetAdapter` abstraction instead of hard-wiring a single `GPT_URL`.

Proposed adapters:

### legacyCustomGPT

Current behavior. Opens the existing `/g/g-...` target and uses the existing response watcher.

### plugin

Opens a fresh ordinary ChatGPT conversation, explicitly activates the 역병킬러 plugin, runs an `AK_PLUGIN_V1` handshake, then submits the real job.

Do not rely on automatic plugin selection.

### plainChatFallback

Opens a fresh ordinary ChatGPT conversation and embeds the minimum authoritative 역병킬러 instruction contract directly into the job prompt.

This path is a fallback for plugin unavailable / plugin activation failure. It must preserve native Writing Block output for RP jobs.

## Job contract

Extend the job object without breaking the current schema:

- `targetMode`: `legacyCustomGPT | plugin | plainChatFallback`
- `pluginProtocol`: `AK_PLUGIN_V1`
- `operation`: `review-zeta | generate-zeta | summarize-zeta`

The existing `type` field remains during migration for backward compatibility.

## Selection

During development, plugin mode must be opt-in behind a local feature flag.

Recommended resolution order after testing:

1. plugin
2. plainChatFallback
3. legacyCustomGPT during the transition window

Do not silently submit a job to plain ChatGPT without either confirmed plugin activation or an embedded fallback instruction contract.

## Regression matrix

Each target mode must be tested for:

- review with no extra instruction
- review with one and multiple extra instructions
- generation with 20-turn collection
- generation with added generation instruction
- summary with default instruction and max length
- summary with custom instruction
- Android Firefox
- Android Chrome where Userscripts is supported
- iOS Userscripts/Safari path
- desktop Chromium/Firefox where available
- temporary chat
- new-tab return path
- Writing Block extraction and RP asterisk preservation
- empty assistant response handling
- diagnostics enabled and disabled

## Promotion gate

Do not merge the plugin branch to main until:

- plugin creation succeeds
- explicit plugin activation can be automated reliably
- handshake succeeds
- all three operations return to ZETA
- Writing Block output remains intact
- fallback behavior is verified
- no regression in 2.25.5.9 legacy mode

## Rollback

Main keeps legacy mode until promotion. If plugin mode breaks after release, the adapter can be forced back to `legacyCustomGPT` without reverting ZETA collection/apply logic.
