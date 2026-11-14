# macOS 27.3 paired WeatherKit responses

Captured on 2026-11-13 from this macOS 27.3 (26C5035r) host, using its native Weather
request credentials only in memory. The rewrite module was disabled for the bounded
probe and restored in `finally`. Each pair uses the same public test location, URL,
User-Agent, schema header and datasets. Only `Accept` differs. Requests begin within
2 ms of each other; exact acquisition times and response media types are in each manifest.

- `hangzhou`, `tianjin`: public city-centre requests, not device-location requests.
- `seattle`: includes 81 native minute records and one real weather alert.
- `seattle-repeat`: explicit no-cache repeat; both HTTP responses report the same Date
  and MISS, but the JSON minute product is two minutes older (82 records versus 84).
  This acquisition is retained rather than selecting only matching responses.

Redaction: no request headers, credentials or device metadata are stored. Metadata
latitude/longitude are replaced with zero in JSON and in vtable-validated binary float
fields. Coordinates embedded in URLs are zeroed with same-length byte substitutions.
The binary is **not re-encoded**; original vtables, product slots, enum values, unknown
fields and timestamps remain. Manifest offsets audit exactly which floats changed.
JSON is compact to retain the wire-response style and avoid generated diff noise.

Schema/codec under test: WeatherKit `dev@cd9d7927`, protocol `v2.0.5` source tag at
`NSRingo/apple.WeatherKit@c87c1dcd` (the local source-build procedure is in
`docs/wk3-weather-json.md`). The comparison does not interpret `unknownN:ubyte` root
placeholders as product schemas.

```sh
node scripts/compare-wk3-pair.mjs output/wk3-paired
node --test tests/weatherKit3Paired.test.mjs
```

The generator writes every field to `fields.csv` (sample, field, JSON, FlatBuffer,
equal, reason), decoded JSON and summary counts. Pollutants are keyed by species
because the two formats return them in opposite orders. Float32 equivalence is used
only for schema float fields, never timestamps; UUIDs and omitted defaults have
explicit comparison rules. Integer mismatches are checked against direct vtable reads.

Additional audit: the Seattle attribution URL coordinates and alert tokens are
redacted in JSON and in-place in the binary. Each manifest records the modified
string byte ranges and updated SHA-256 hashes.
