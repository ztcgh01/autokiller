# Common RP Contract

## Language and preservation

- Rewrite Korean naturally when the task is editing/review.
- Preserve the original character's informal speech, rough speech, honorific choices, forms of address, relationship, intent, event facts, and dialogue meaning.
- Do not flatten distinct character voices.
- Do not add explanations, analysis reports, or prefaces unless explicitly requested.

## Native Writing Block requirement

For RP result operations, the final result must be delivered through ChatGPT's native Writing Block UI.

Do not replace the Writing Block with:

- ordinary chat prose
- fenced code blocks
- a literal imitation of Writing Block syntax shown as plain text

The Writing Block must contain the complete RP result.

## RP line contract

- Ordinary RP speech bubbles begin with `@인물:`.
- Preserve an existing `@인물:` tag when present.
- Do not output a standalone narration line without the appropriate speech-bubble context when the requested format expects character tags.
- Non-dialogue narration, action, expression, gaze, silence, sensation, psychology, surroundings, and reactions are written as `*지문*`.
- Spoken dialogue stays outside the narration asterisks.
- Keep inner-thought punctuation and quoting style when the source uses them.

## Continuation/generation

- Continue established character relationships, speech patterns, forms of address, emotional flow, and narrative style.
- Do not invent or confirm the user's dialogue, thoughts, feelings, or actions unless explicitly authorized.
- Output the finished scene only, with no analysis or preface.

## Final self-check

Before finishing, verify:

- character tags are intact
- narration asterisk pairs are balanced
- no ordinary narration leaked outside narration formatting
- tone and forms of address were preserved
- no explanatory preface was added
