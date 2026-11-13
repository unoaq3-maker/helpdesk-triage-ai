#!/usr/bin/env node
"use strict";
const assert = require("assert");
const path = require("path");
const { analyze } = require(path.join(__dirname, "..", "js", "rules.js"));
const samples = require(path.join(__dirname, "..", "js", "samples.js"));

let failed = 0;
for (const sample of samples) {
  const result = analyze(sample.text);
  try {
    assert.ok(result.ok, sample.id + " should analyze");
    assert.strictEqual(
      result.category,
      sample.expectedCategory,
      `${sample.id} category: got ${result.category}, expected ${sample.expectedCategory}`
    );
    assert.strictEqual(
      result.priority.id,
      sample.expectedPriority,
      `${sample.id} priority: got ${result.priority.id}, expected ${sample.expectedPriority}`
    );
    console.log(`PASS ${sample.id}  ${result.category}  ${result.priority.id} ${result.priority.label}  (${result.impact} × ${result.urgency})`);
  } catch (err) {
    failed += 1;
    console.error("FAIL", sample.id, err.message);
    console.error("   impact=", result.impact, "urgency=", result.urgency, "priority=", result.priority && result.priority.id);
    console.error("   scores=", result.categoryScores);
    console.error("   signals=", (result.signals || []).map((s) => s.type + ":" + s.match).join(" | "));
  }
}

const empty = analyze("   ");
assert.strictEqual(empty.ok, false, "empty ticket should fail closed");
console.log("PASS empty-ticket guard");

// A vague one-user ticket should not become P1
const vague = analyze("My application is slow today and I would like someone to look when you have time.");
assert.ok(vague.ok);
assert.notStrictEqual(vague.priority.id, "P1", "a single low-urgency complaint must not be P1");
console.log("PASS no-false-P1  ", vague.category, vague.priority.id, vague.impact, "×", vague.urgency);

if (failed) {
  console.error(`\n${failed} sample(s) failed`);
  process.exit(1);
}
console.log("\nAll tests passed.");
