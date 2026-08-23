import assert from "node:assert/strict";
import test from "node:test";

import { isRouteDecision } from "../src/lib/play.ts";

const regional = {
  id: "sr-hk",
  region: "hk",
  country: "HK",
  healthy: true,
  load: 0,
  latencyMs: 12,
  endpoints: { web: "https://play-hk.sr.example/" },
};

const edgeDefault = {
  id: "sr-default",
  region: "default",
  healthy: true,
  load: 0,
  latencyMs: 18,
  endpoints: { web: "https://play.sr.example/" },
};

function decision(recommended, candidates) {
  return {
    service: "sr-game",
    recommended,
    candidates,
    generatedAt: "2026-08-24T00:00:00Z",
    expiresAt: "2026-08-24T00:00:30Z",
    ttl: 30,
    staleIfError: 300,
    decisionId: "decision-1",
    configVersion: 1,
  };
}

test("accepts a legacy candidate whose country key is absent", () => {
  assert.equal(isRouteDecision(decision(regional, [regional, edgeDefault])), true);
});

test("accepts a legacy recommendation whose country key is absent", () => {
  assert.equal(isRouteDecision(decision(edgeDefault, [edgeDefault, regional])), true);
});

test("still rejects a country value with the wrong type", () => {
  const invalid = { ...edgeDefault, country: 42 };
  assert.equal(isRouteDecision(decision(regional, [regional, invalid])), false);
});
