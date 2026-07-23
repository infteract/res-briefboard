/**
 * Exhaustive test for the streaming partial-JSON parser: every prefix of the
 * replay document must parse without throwing, string content must never
 * regress between prefixes (no flicker), and the complete document must
 * round-trip exactly. Runs on plain Node (type stripping): `npm test`.
 */
import assert from "node:assert/strict";
import { parsePartialJson } from "../lib/partial-json.ts";
import { REPLAY_BOARD, REPLAY_JSON } from "../lib/replay.ts";

let parsed = 0;
let lastNameLen = 0;

for (let i = 1; i <= REPLAY_JSON.length; i++) {
  const value = parsePartialJson(REPLAY_JSON.slice(0, i));
  assert.notEqual(value, undefined, `prefix ${i} failed to parse`);
  assert.equal(typeof value, "object", `prefix ${i} parsed to a non-object`);
  parsed++;

  const name = (value as { brand_name?: unknown }).brand_name;
  const len = typeof name === "string" ? name.length : 0;
  assert.ok(len >= lastNameLen, `string content regressed at prefix ${i}`);
  lastNameLen = Math.max(lastNameLen, len);
}

assert.deepEqual(
  parsePartialJson(REPLAY_JSON),
  REPLAY_BOARD,
  "full document must round-trip exactly",
);

const adversarial = [
  '{"a":"he said \\"hi\\" to me","b":[1,-2.5,3e4],"c":{"d":true,"e":null,"f":false}}',
  '{"empty":{},"arr":[],"nested":[[1,2],[3,[4,{"x":"y"}]]],"u":"café \\u00e9"}',
  '{"n":-0.5e-2,"s":"ends with backslash \\\\"}',
  '```json\n{"fenced":"input","ok":true}\n```',
];

for (const doc of adversarial) {
  for (let i = 1; i <= doc.length; i++) {
    const value = parsePartialJson(doc.slice(0, i));
    if (value !== undefined) {
      assert.equal(typeof value, "object", `adversarial prefix parsed to non-object: ${doc.slice(0, i)}`);
    }
  }
}

console.log(
  `parser tests passed: ${parsed} replay prefixes, ${adversarial.length} adversarial documents`,
);
