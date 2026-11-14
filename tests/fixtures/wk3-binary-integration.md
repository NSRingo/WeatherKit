# WK3 integration fixture

`hangzhou/` is a sanitized native macOS 27.3 (26C5035r) JSON/FlatBuffer pair from
2026-11-13, schema `lib-rc-3.0.0-b66`. The manifest records acquisition times,
response media types, hashes and in-place redaction offsets. Coordinates are zero;
no request credentials or device identifiers are included. The binary is not re-encoded.

`weatherKit3WeatherReplacement.test.mjs` uses this binary to verify current/daily/hourly
replacement, provider failure isolation, future-field preservation and unchanged
native/disabled-provider responses. Other protocol samples and schema tests belong
to the companion `NSRingo/apple.WeatherKit` change.
