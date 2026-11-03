import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("Linux packaging contracts preserve launch behavior and reject incomplete source ownership", {
    skip: process.platform === "win32",
}, () => {
    const result = spawnSync(
        "python3",
        [
            "-m",
            "unittest",
            "discover",
            "-s",
            fileURLToPath(new URL(".", import.meta.url)),
            "-p",
            "linux_appimage_test.py",
        ],
        {
            encoding: "utf8",
        }
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
});
