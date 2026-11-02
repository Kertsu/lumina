import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { validDownloads } from "../docs/releases/public/docs/downloads.mjs";
import {
    compareVersions,
    PUBLIC_FILES,
    preparePublication,
    publicContent,
} from "./publish-release.mjs";
import { TARGETS } from "./release.mjs";

function fixture(context, mode = "production", ids = Object.keys(TARGETS)) {
    const root = mkdtempSync(join(tmpdir(), "lumina-publication-"));
    context.after(() =>
        rmSync(root, {
            recursive: true,
            force: true,
        })
    );
    return ids.map((id) => {
        const target = TARGETS[id];
        const directory = join(root, id);
        mkdirSync(directory);
        const updater = `Lumina${mode === "poc" ? " POC" : ""}${target.updaterExtension}`;
        const installer = `Lumina${mode === "poc" ? " POC" : ""}${target.installerExtension}`;
        writeFileSync(join(directory, updater), "binary package");
        writeFileSync(
            join(directory, `${updater}.sig`),
            "valid signature text"
        );
        writeFileSync(join(directory, installer), "binary package");
        writeFileSync(
            join(directory, "THIRD-PARTY-NOTICES.html"),
            "dependency notices"
        );
        writeFileSync(
            join(directory, "build-info.json"),
            JSON.stringify({
                schemaVersion: 1,
                version: "0.1.0-beta.4",
                mode,
                target: id,
                identifier: `com.kurtddanielbigtas.lumina${mode === "poc" ? ".poc" : ""}`,
                sourceCommit: "a".repeat(40),
                updaterPackage: updater,
            })
        );
        return directory;
    });
}

test("complete production matrix creates signed platform metadata and collision-free asset names", (context) => {
    const release = preparePublication(
        fixture(context),
        "release",
        "Fixed an issue."
    );
    assert.equal(release.tag, "v0.1.0-beta.4");
    assert.equal(validDownloads(release.downloads), true);
    assert.deepEqual(Object.keys(release.manifest.platforms).sort(), [
        "darwin-aarch64",
        "darwin-x86_64",
        "linux-x86_64",
        "windows-x86_64",
    ]);
    const mac = release.manifest.platforms["darwin-aarch64"];
    assert.deepEqual(mac, release.manifest.platforms["darwin-x86_64"]);
    for (const platform of Object.values(release.manifest.platforms)) {
        assert.equal(platform.signature, "valid signature text");
        const filename = decodeURIComponent(platform.url.split("/").at(-1));
        assert.ok(release.assets.has(filename));
        assert.match(
            platform.url,
            /^https:\/\/github.com\/Kertsu\/lumina-releases\/releases\/download\/v0.1.0-beta.4\//
        );
    }
    const sums = release.assets.get("SHA256SUMS").toString();
    assert.match(sums, / {2}updater.json\n/);
    assert.equal(sums.includes("private-key"), false);
    assert.equal(sums.includes("SHA256SUMS"), false);
});

test("POC or incomplete matrices are draft-only and use a separate rehearsal tag", (context) => {
    for (const mode of ["poc", "production"]) {
        const directories = fixture(context, mode, ["macos-universal"]);
        const draft = preparePublication(
            directories,
            "draft",
            "Private rehearsal."
        );
        assert.equal(draft.tag, "rehearsal-v0.1.0-beta.4");
        assert.match(
            draft.manifest.platforms["darwin-aarch64"].url,
            /rehearsal-v/
        );
        assert.throws(
            () => preparePublication(directories, "release", "notes"),
            /every target/
        );
    }
});

test("mixed commits, versions, modes, and duplicate targets cannot publish", (context) => {
    for (const change of [
        {
            sourceCommit: "b".repeat(40),
        },
        {
            version: "0.1.0-beta.5",
        },
        {
            mode: "poc",
            identifier: "com.kurtddanielbigtas.lumina.poc",
        },
    ]) {
        const directories = fixture(context);
        const path = join(directories[0], "build-info.json");
        writeFileSync(
            path,
            JSON.stringify({
                ...JSON.parse(readFileSync(path)),
                ...change,
            })
        );
        assert.throws(
            () => preparePublication(directories, "release", "notes"),
            /same version/
        );
    }
    const [directory] = fixture(context, "poc", ["macos-universal"]);
    assert.throws(
        () => preparePublication([directory, directory], "draft", "notes"),
        /Duplicate build target/
    );
});

test("unexpected files, symlinks, missing signatures, and unsafe paths fail closed", (context) => {
    const [directory] = fixture(context, "poc", ["macos-universal"]);
    writeFileSync(join(directory, "private-key.key"), "never upload this");
    assert.throws(
        () => preparePublication([directory], "draft", "notes"),
        /Unexpected file/
    );
    rmSync(join(directory, "private-key.key"));
    const signature = join(directory, "Lumina POC.app.tar.gz.sig");
    writeFileSync(signature, "");
    assert.throws(
        () => preparePublication([directory], "draft", "notes"),
        /Missing updater signature/
    );
    rmSync(signature);
    symlinkSync(join(directory, "build-info.json"), signature);
    assert.throws(
        () => preparePublication([directory], "draft", "notes"),
        /regular file/
    );
    rmSync(signature);
    const path = join(directory, "build-info.json");
    writeFileSync(
        path,
        JSON.stringify({
            ...JSON.parse(readFileSync(path)),
            updaterPackage: "../private.app.tar.gz",
        })
    );
    assert.throws(
        () => preparePublication([directory], "draft", "notes"),
        /filename/
    );
});

test("only named public documents are copied; beta and stable feeds have distinct transitions", (context) => {
    const temporary = mkdtempSync(join(tmpdir(), "lumina-public-docs-"));
    const root = join(temporary, "docs/releases/public");
    mkdirSync(root, {
        recursive: true,
    });
    context.after(() =>
        rmSync(temporary, {
            recursive: true,
            force: true,
        })
    );
    for (const file of Object.values(PUBLIC_FILES)) {
        const path = join(root, file);
        mkdirSync(join(path, ".."), {
            recursive: true,
        });
        writeFileSync(path, "public documentation");
    }
    writeFileSync(join(root, "private-source.rs"), "private application code");
    const draftFiles = publicContent(root);
    assert.equal(draftFiles.size, Object.keys(PUBLIC_FILES).length);
    assert.equal(
        [...draftFiles.keys()].some((name) => name.includes("updates/")),
        false
    );
    assert.equal(draftFiles.has("private-source.rs"), false);
    const beta = publicContent(root, {
        version: "0.1.0-beta.4",
    });
    assert.ok(beta.has("docs/updates/beta.json"));
    assert.equal(beta.has("docs/updates/stable.json"), false);
    const stable = publicContent(root, {
        version: "0.1.0",
    });
    assert.equal(
        stable.get("docs/updates/beta.json"),
        stable.get("docs/updates/stable.json")
    );
});

test("version ordering handles beta counters, stable transition, and future beta lines", () => {
    assert.equal(compareVersions("0.1.0-beta.10", "0.1.0-beta.9"), 1);
    assert.equal(compareVersions("0.1.0", "0.1.0-beta.100"), 1);
    assert.equal(compareVersions("0.1.1", "0.2.0-beta.1"), -1);
    assert.equal(compareVersions("0.1.0", "0.1.0"), 0);
    assert.throws(() => compareVersions("v0.1.0", "0.1.0"));
});

test("documentation sync requires a change description before reading files", () => {
    for (const message of [undefined, "   "]) {
        const result = spawnSync(
            process.execPath,
            [
                fileURLToPath(
                    new URL("./publish-release.mjs", import.meta.url)
                ),
                "--docs",
                join(tmpdir(), "lumina-unused-docs-path"),
                "--sync-docs",
                ...(message === undefined ? [] : ["--message", message]),
            ],
            {
                encoding: "utf8",
            }
        );
        assert.equal(result.status, 1);
        assert.match(
            result.stderr,
            /Documentation sync requires --message describing the change/
        );
    }
});
