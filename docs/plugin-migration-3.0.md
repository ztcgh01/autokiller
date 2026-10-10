# AUTO_KILLER 3.0 Plugin Migration Design

## Stable production baseline

Production remains **2.25.5.9** on `main`.

The migration is isolated on `plugin-migration-3.0`. The existing Custom GPT URL remains available as the rollback adapter.

## Plugin release

The private personal plugin has been created and migrated.

- ID: `plugins_6aca3662eee4819184ade9b529406401`
- name: `yeokbyeong-killer`
- display name: `역병킬러`
- migrated release: `0.4.3`
- skill-only
- no API key
- no MCP dependency

The source of the current release is mirrored under `plugin/`.

v0.4.2 adds a mandatory current-run load gate in `skills/base/SKILL.md`: RP review/generation must load the full `legacy-instructions-verbatim.md` in the current execution instead of relying on memory or summarized rules. The verbatim RP source itself is unchanged.

v0.4.3 adds a structure-preservation validation gate after runtime smoke testing found that native Writing Block output could still drop the `InfoBox` header or alter `\\>` quote spacing. The gate re-checks existing `[형식 보존]` requirements before final output; the 98-line verbatim RP source remains unchanged.

## Adapter model

AUTO_KILLER no longer needs one hard-coded ChatGPT target in the migration branch.

### plugin

Preferred 3.0 mode.

- opens ordinary ChatGPT
- forces a fresh temporary chat for every job
- requests use of `@역병킬러`
- verifies activation before the real job with a challenge/response handshake
- sends a JSON job envelope with `protocol`, `operation`, `body`, and `options`
- keeps the existing response watcher and ZETA return path

The real RP body is never submitted under an unverified assumption that the plugin is active.

### plainChatFallback

Fallback when plugin verification fails.

- stays API-key-free
- opens/uses the same fresh temporary ChatGPT job
- injects the authoritative minimum RP contract with the job
- preserves native Writing Block output for review and generation
- preserves the dedicated summary behavior

This fallback exists so an unavailable plugin does not strand a ZETA job.

### legacyCustomGPT

Rollback path using the existing `/g/g-...` 역병킬러.

Legacy conversation reuse remains isolated to this adapter only. Plugin/fallback modes always use a new temporary chat.

## Plugin handshake

Protocol: `AK_PLUGIN_V1`

The request contains the challenge:

`AK_PLUGIN_V1_CHALLENGE:7419`

Only the plugin skill knows the required success response:

`AK_PLUGIN_V1_OK:Q9M4`

The expected response is not included in the handshake prompt. This prevents an ordinary ChatGPT response from trivially copying the success token from the request.

If verification fails, AUTO_KILLER records `PLUGIN_HANDSHAKE_FAILED` and switches to the embedded fallback rather than sending the raw job.

## Job contract

Migration jobs keep the current schema and add optional fields:

- `targetMode`: `plugin | plainChatFallback | legacyCustomGPT`
- `pluginProtocol`: `AK_PLUGIN_V1`
- `operation`: `review-zeta | generate-zeta | summarize-zeta`
- `pluginBody`: source/transcript data
- `pluginOptions`: explicit user/AUTO_KILLER options

The existing `type` and `text` fields remain for backward compatibility with 2.25.x.

## RP contract retained

The plugin contains dedicated reference files for:

- native Writing Block output
- `@인물:` tags
- literal escaped narration `\*...\*`
- default joined narration/dialogue layout
- explicit 엔터 split behavior
- narrator `@:` absorption
- 수정 / 정리 / 합치기 / 나누기
- 짧출
- 앵무새
- 말풍
- 이어쓰기 / 새 장면 생성
- Korean grammar / 조사 cleanup
- tone, rough speech, honorific, relationship, and emotion preservation
- no invention of user dialogue/thought/emotion/action

Summary remains plain summary text rather than RP Writing Block output.

## Empty-response hardening

The migration branch also rejects UI-only shells such as `역병킬러의 말:` as real answer text.

If an assistant turn has finished response-action buttons but no actual body for 8 seconds, AUTO_KILLER records `GPT_EMPTY_RESPONSE`, shows an explicit empty-response error, and does not apply a fake result to ZETA.

Diagnostics initialization is isolated so a future diagnostic bug cannot abort the main AUTO_KILLER panel before startup.

## Test UI

The migration branch adds a ChatGPT connection-mode selector:

- 플러그인 3.0
- 기존 Custom GPT
- 내장 지침 fallback

Plugin/fallback modes force fresh temporary chats.

## Regression matrix

Before promotion, test:

- review, no extra instruction
- review, one built-in option
- review, multiple built-in/user options
- 짧출
- 엔터
- 앵무새
- 말풍
- generation with normal recent-context collection
- generation with 답변량 / 전개 / 대사 options
- summary with default instruction
- summary with custom max length and extra prompts
- Writing Block extraction
- literal narration backslash cleanup on ZETA return
- empty assistant response
- plugin handshake success
- plugin handshake failure -> embedded fallback
- manual legacy rollback mode
- diagnostics OFF
- diagnostics ON
- Android Firefox OneClick
- Android Chrome/compatible userscript environment
- iOS Userscripts/Safari
- desktop Chromium/Firefox
- new-tab return
- same-tab return where supported
- temporary-chat entry

## Promotion gate

Do not fast-forward `main` until:

1. plugin release is readable in a **new ChatGPT conversation**
2. handshake succeeds there
3. review/generate/summary all round-trip ZETA -> ChatGPT -> ZETA
4. Writing Blocks remain intact
5. fallback passes at least one forced failure test
6. legacy rollback still works
7. no syntax/runtime regression appears with diagnostics enabled

## Rollback

Until promotion, production remains 2.25.5.9.

After promotion, the adapter can still be forced to `legacyCustomGPT` if plugin routing has a platform regression. ZETA extraction and result-application logic do not need to be reverted.


## Exact instruction-source guarantee

The user's uploaded current Custom GPT instructions are copied verbatim into `plugin/skills/base/references/legacy-instructions-verbatim.md` and are the authoritative RP source for plugin mode.

Verification performed during migration:

- uploaded instruction text length: 6393 characters after newline normalization
- plugin reference text length: 6393 characters after newline normalization
- source file line count: 98
- raw-content integrity fingerprint (FNV-1a 64, Unicode code points): `b4296d3b4d3daa4c`
- exact source/plugin comparison: PASS
- AUTO_KILLER `LEGACY_RP_INSTRUCTIONS` vs plugin mirror comparison: PASS

The reconstructed RP helper documents used in early migration drafts were removed from the live plugin so they cannot conflict with the verbatim source. AUTO_KILLER's embedded fallback also embeds the same exact instruction text in the 3.0 alpha branch.


## v0.4.4 exact-RP structure correction

After runtime testing, the migration architecture was simplified to match the user's requirement of a verbatim transplant. Direct RP rules now live directly in `skills/rp/SKILL.md` as the exact 98-line source text (6393 normalized characters), with no added load gate or structure gate. AUTO_KILLER transport/handshake logic is isolated in a separate `skills/auto-killer/` skill. The previous `skills/base/` wrapper and its added gates were removed.
