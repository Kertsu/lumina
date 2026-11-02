import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { javascriptNotices, renderNotices } from "./notices.mjs";

test("notices include original copyright text while escaping markup and excluding private metadata", () => {
    const rendered = renderNotices(
        [
            {
                name: "example@1.0.0",
                license: "MIT",
                source: "https://example.com/source",
                texts: [
                    "Copyright Example <author@example.com>\n<script>unsafe()</script>",
                ],
            },
        ],
        {
            licenses: [
                {
                    id: "MPL-2.0",
                    text: "MPL license text",
                    source_path: "/private/build/cache/LICENSE",
                    used_by: [
                        {
                            crate: {
                                name: "component",
                                version: "1.2.3",
                                manifest_path:
                                    "/private/build/source/Cargo.toml",
                            },
                        },
                    ],
                },
            ],
        },
        "Bundled material notices"
    );
    assert.ok(
        rendered.includes("Copyright Example &lt;author@example.com&gt;")
    );
    assert.equal(rendered.includes("<script>"), false);
    assert.equal(rendered.includes("/private/build"), false);
    assert.ok(
        rendered.includes(
            "https://crates.io/api/v1/crates/component/1.2.3/download"
        )
    );
    assert.throws(
        () =>
            renderNotices([], {
                licenses: [],
            }),
        /Incomplete/
    );
});

test("a dependency without usable license text stops notice generation", (context) => {
    const root = mkdtempSync(join(tmpdir(), "lumina-license-test-"));
    context.after(() =>
        rmSync(root, {
            recursive: true,
            force: true,
        })
    );
    const directory = join(root, "package");
    mkdirSync(directory);
    writeFileSync(
        join(directory, "package.json"),
        JSON.stringify({
            name: "example",
            version: "1.0.0",
        })
    );
    const report = {
        MIT: [
            {
                name: "example",
                versions: ["1.0.0"],
                paths: [directory],
                license: "MIT",
            },
        ],
    };
    assert.throws(() => javascriptNotices(report), /Missing license text/);
    writeFileSync(join(directory, "LICENSE"), "Copyright Example\nMIT terms");
    assert.equal(
        javascriptNotices(report)[0].texts[0],
        "Copyright Example\nMIT terms"
    );
    report.MIT[0].license = "GPL-3.0-only";
    assert.throws(
        () => javascriptNotices(report),
        /Review the new dependency license/
    );
});
