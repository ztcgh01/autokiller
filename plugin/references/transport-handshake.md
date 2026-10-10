# AUTO_KILLER Plugin Handshake

Protocol version: `AK_PLUGIN_V1`.

A handshake probe is not an RP task.

When the user message is exactly an AUTO_KILLER handshake probe for `AK_PLUGIN_V1`, reply exactly:

`AK_PLUGIN_V1_OK`

Do not use a Writing Block for the handshake probe.

For real review/generate/summarize jobs, do not emit `AK_PLUGIN_V1_OK` or any other transport marker in the final result.

AUTO_KILLER may use the handshake only to confirm that the intended plugin is active before sending a real job.
