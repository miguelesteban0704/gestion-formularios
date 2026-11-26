import assert from "node:assert/strict";
import test from "node:test";
import * as realtimeStats from "../services/realtimeStats.js";

test("public response total excludes private and unlisted form responses", () => {
  const forms = [
    { _id: "public-form", status: "published", visibility: "public", isArchived: false },
    { _id: "private-form", status: "published", visibility: "private", isArchived: false },
    { _id: "unlisted-form", status: "published", visibility: "unlisted", isArchived: false },
    { _id: "draft-form", status: "draft", visibility: "public", isArchived: false },
  ];
  const responseCounts = [
    { form: "public-form", count: 21 },
    { form: "private-form", count: 1 },
    { form: "unlisted-form", count: 8 },
    { form: "draft-form", count: 5 },
  ];

  const total = typeof realtimeStats.sumPublicResponseCounts === "function"
    ? realtimeStats.sumPublicResponseCounts(forms, responseCounts)
    : undefined;

  assert.equal(total, 21);
});
