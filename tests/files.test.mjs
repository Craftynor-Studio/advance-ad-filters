// Checks every filter list and script against the rules in README.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTLETS = new Set(['set-constant', 'json-prune']);
const HOST = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const FORBIDDEN = [
  [/\bfetch\s*\(/, 'fetch'], [/\bXMLHttpRequest\b/, 'XMLHttpRequest'], [/\bWebSocket\b/, 'WebSocket'],
  [/\bsendBeacon\b/, 'sendBeacon'], [/\beval\s*\(/, 'eval'], [/\bnew\s+Function\b/, 'new Function'],
  [/\bimport\s*\(/, 'import()'], [/document\s*\.\s*cookie/, 'document.cookie'], [/\blocalStorage\b/, 'localStorage'],
  [/\bsessionStorage\b/, 'sessionStorage'], [/set(Timeout|Interval)\s*\(\s*['"`]/, 'string timer'],
];

for (const name of readdirSync(join(root, 'filters'))) {
  test(`filters/${name}`, () => {
    assert.match(name, /^[a-z0-9-]+\.txt$/);
    const lines = readFileSync(join(root, 'filters', name), 'utf8').split(/\r?\n/);
    for (const header of ['Title', 'Description', 'Homepage', 'License', 'Expires']) {
      assert.ok(lines.some((l) => l.startsWith(`! ${header}: `)), `has "! ${header}:"`);
    }
    let rules = 0;
    lines.forEach((line, i) => {
      if (!line.trim() || line.startsWith('!')) return;
      const rule = /^([a-z0-9.,-]+)##\+js\(([a-z-]+)(?:, (.+))?\)$/.exec(line);
      assert.ok(rule, `line ${i + 1}: expected "host##+js(scriptlet, args)"`);
      rule[1].split(',').forEach((host) => assert.match(host, HOST, `line ${i + 1}: host ${host}`));
      assert.ok(SCRIPTLETS.has(rule[2]), `line ${i + 1}: unknown scriptlet ${rule[2]}`);
      // Each group of rules starts with a comment saying what it removes.
      const previous = lines.slice(0, i).reverse().find((l) => l.trim());
      assert.ok(previous && (previous.startsWith('! ') || previous.includes('##')), `line ${i + 1}: rules need a comment`);
      rules++;
    });
    assert.ok(rules > 0, 'has rules');
  });
}

for (const name of readdirSync(join(root, 'scripts'))) {
  test(`scripts/${name}`, () => {
    assert.match(name, /^[a-z0-9-]+\.js$/);
    const code = readFileSync(join(root, 'scripts', name), 'utf8');
    for (const [pattern, label] of FORBIDDEN) assert.doesNotMatch(code, pattern, `uses ${label}`);
    assert.ok(code.split('\n').every((line) => line.length <= 200), 'readable: no line over 200 characters');
    assert.doesNotThrow(() => new vm.Script(code, { filename: name }), 'parses');
  });
}
