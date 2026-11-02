import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { POC_HOST, POC_PORT } from "./release.mjs";
import { updaterTestServer } from "./updater-poc.mjs";

function artifact(context, overrides = {}) {
    const directory = mkdtempSync(join(tmpdir(), "lumina-updater-poc-"));
    context.after(() =>
        rmSync(directory, {
            recursive: true,
            force: true,
        })
    );
    const info = {
        schemaVersion: 1,
        version: "0.1.0-beta.2",
        mode: "poc",
        identifier: "com.example.lumina.poc",
        target: "macos-universal",
        updaterPackage: "Lumina POC.app.tar.gz",
        ...overrides,
    };
    writeFileSync(join(directory, "build-info.json"), JSON.stringify(info));
    writeFileSync(
        join(directory, "Lumina POC.app.tar.gz"),
        "signed package bytes"
    );
    writeFileSync(
        join(directory, "Lumina POC.app.tar.gz.sig"),
        "signed-package-signature\n"
    );
    return directory;
}

test("serves signed update metadata for both Mac architectures and only the selected package", async (context) => {
    const directory = artifact(context);
    writeFileSync(join(directory, "private-note.txt"), "not served");
    const { server } = updaterTestServer(directory);
    server.listen(0, POC_HOST);
    await once(server, "listening");
    context.after(() => {
        server.closeAllConnections();
        server.close();
    });
    const origin = `http://${POC_HOST}:${server.address().port}`;
    const response = await fetch(`${origin}/latest.json`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const manifest = await response.json();
    assert.equal(manifest.version, "0.1.0-beta.2");
    assert.deepEqual(Object.keys(manifest.platforms), [
        "darwin-aarch64",
        "darwin-x86_64",
    ]);
    const update = manifest.platforms["darwin-aarch64"];
    assert.equal(update.signature, "signed-package-signature");
    assert.equal(new URL(update.url).hostname, POC_HOST);
    assert.equal(new URL(update.url).port, String(POC_PORT));
    const path = new URL(update.url).pathname;
    const bytes = await fetch(`${origin}${path}`);
    assert.equal(await bytes.text(), "signed package bytes");
    const head = await fetch(`${origin}${path}`, {
        method: "HEAD",
    });
    assert.equal(head.headers.get("content-length"), "20");
    assert.equal(await head.text(), "");
    for (const path of [
        "/private-note.txt",
        "/../private-note.txt",
        "/build-info.json",
        "/",
    ]) {
        assert.equal((await fetch(`${origin}${path}`)).status, 404);
    }
    assert.equal(
        (
            await fetch(`${origin}/latest.json`, {
                method: "POST",
            })
        ).status,
        405
    );
    const forbidden = await new Promise((resolve, reject) => {
        get(
            `${origin}/latest.json`,
            {
                headers: {
                    Host: "example.invalid",
                },
            },
            (result) => {
                result.resume();
                resolve(result.statusCode);
            }
        ).on("error", reject);
    });
    assert.equal(forbidden, 403);
});

test("rejects production builds, traversal filenames, absent signatures, and directories", (context) => {
    assert.throws(
        () =>
            updaterTestServer(
                artifact(context, {
                    mode: "production",
                })
            ),
        /POC artifact/
    );
    assert.throws(
        () =>
            updaterTestServer(
                artifact(context, {
                    updaterPackage: "../secret.app.tar.gz",
                })
            ),
        /filename/
    );
    const unsigned = artifact(context);
    rmSync(join(unsigned, "Lumina POC.app.tar.gz.sig"));
    assert.throws(() => updaterTestServer(unsigned), /sig/);
    const invalid = artifact(context);
    rmSync(join(invalid, "Lumina POC.app.tar.gz"));
    mkdirSync(join(invalid, "Lumina POC.app.tar.gz"));
    assert.throws(() => updaterTestServer(invalid), /regular files/);
});
