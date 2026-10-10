# AUTO_KILLER 3.0 Plugin Migration Test Checklist

## Before testing

- Production `main` stays on 2.25.5.9.
- Disable the normal AUTO_KILLER userscript while running the migration test loader.
- Use a **new ChatGPT conversation** after each plugin release update because an already-open conversation may keep the previous skill snapshot.
- Keep the plugin private during this phase.

## Phase 1: plugin-only smoke test

Start a new ChatGPT chat and select/mention `@역병킬러`.

### Handshake

Send the plugin handshake challenge:

`AK_PLUGIN_V1_CHALLENGE:7419`

Expected exact reply:

`AK_PLUGIN_V1_OK:Q9M4`

No Writing Block should be used for the handshake.

### Direct RP review

Use a small RP sample containing:

- `@인물:`
- narration
- dialogue
- informal or rough speech
- an inner-thought form such as `('...')`

Expected:

- native Writing Block
- `@인물:` preserved
- narration emitted as literal `\*...\*`
- inner thought remains inner thought
- no preface / analysis

### Formatting edge cases

Test:

- `@:` narrator
- InfoBox or message-box content
- `\>` quote line
- narration -> dialogue -> narration order
- intentionally repeated punctuation

Expected:

- narrator absorbed where appropriate
- structural blocks preserved
- quote line remains standalone
- narration does not merge across intervening dialogue
- accidental 4+ symbol spam reduced unless clearly intentional

## Phase 2: AUTO_KILLER plugin mode

Install the branch test loader and select:

`설정 -> ChatGPT 연결 방식 -> 플러그인 3.0`

Plugin/fallback modes force a fresh temporary chat.

### Review

Test in order:

1. plain review
2. 짧출
3. 엔터
4. 앵무새
5. 말풍
6. multiple selected options
7. one custom review prompt

Verify the returned ZETA text keeps tags, narration, speech style, and bubble boundaries.

### Generate

Test:

1. default recent-context generation
2. 답변량
3. 전개
4. 대사
5. custom generation instruction

Verify the user's dialogue/thought/emotion/action is not invented.

### Summarize

Test:

1. default summary
2. custom max length
3. 캐붕 방지 prompt
4. safety prompt
5. direct/custom summary instruction

Verify summary output is plain summary text, not an RP Writing Block.

## Phase 3: failure-path tests

### Force embedded fallback

Select:

`내장 지침 fallback`

Run review, generate, and summary once each.

Expected: no plugin dependency, but RP review/generation still use native Writing Block and preserve the same core contract.

### Legacy rollback

Select:

`기존 Custom GPT`

Run one review.

Expected: old 2.25.x transport behavior still works.

### Empty assistant response

If ChatGPT produces an assistant shell with action buttons but no body:

- AUTO_KILLER must not return `역병킬러의 말:` as content.
- after the empty-body guard expires, show an explicit empty-response error.
- do not apply a fake result to ZETA.

## Phase 4: device matrix

After desktop/primary-browser success, verify:

- Android Firefox OneClick
- Android Chromium/compatible userscript environment
- iOS Userscripts/Safari
- desktop Chromium
- desktop Firefox

For each, test at least one plugin-mode review and the return-to-ZETA path.

## Promotion gate

Do not merge to `main` until all of these pass:

- new-chat plugin release is active
- handshake succeeds
- review / generate / summary round-trip
- Writing Block extraction
- literal narration escape cleanup on ZETA return
- fallback mode
- legacy rollback
- diagnostics ON
- diagnostics OFF
- no blank-response false success
- no startup failure before the AUTO_KILLER panel appears
