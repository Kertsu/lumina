import assert from "node:assert/strict";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
    buildOverrides,
    collectArtifacts,
    POC_ENDPOINT,
    readWorkspaceVersion,
    TARGETS,
    updaterEndpoint,
    validatePublication,
    validateVersion,
    withWorkspaceVersion,
} from "./release.mjs";

const base = {
    productName: "Lumina",
    identifier: "com.example.lumina",
    plugins: {
        updater: {
            pubkey: "public-verification-key",
            endpoints: ["https://example.invalid/updates/beta.json"],
        },
    },
};

test("version overrides change only workspace.package.version and retain comments and line endings", () => {
    const manifest =
        '[package]\r\nversion = "0.1.0-beta.1"\r\n[workspace.package]\r\nversion = "0.1.0-beta.1" # beta\r\nedition = "2021"\r\n[dependencies]\r\na = "0.1.0-beta.1"\r\n';
    const changed = withWorkspaceVersion(manifest, "0.1.0-beta.2");
    assert.equal(readWorkspaceVersion(changed), "0.1.0-beta.2");
    assert.ok(changed.includes('version = "0.1.0-beta.2" # beta\r\nedition'));
    assert.ok(changed.startsWith('[package]\r\nversion = "0.1.0-beta.1"'));
    assert.ok(changed.endsWith('a = "0.1.0-beta.1"\r\n'));
    assert.throws(
        () => readWorkspaceVersion('[package]\nversion = "0.1.0"\n'),
        /workspace.package.version/
    );
});

test("release versions reject malformed or ambiguous beta counters", () => {
    for (const version of [
        "0.1.0-beta.1",
        "0.1.0-beta.10",
        "0.1.0",
        "12.3.4",
    ]) {
        assert.equal(validateVersion(version), version);
    }
    for (const version of [
        "v0.1.0",
        "0.1.0-beta.01",
        "01.1.0",
        "0.1.0-beta",
        "0.1.0\n",
        "0.1.0\nother",
        "0.1.0; echo bad",
    ]) {
        assert.throws(() => validateVersion(version));
    }
});

test("POC configuration isolates app data and local HTTP without changing production configuration", () => {
    const original = structuredClone(base);
    const poc = buildOverrides(base, "macos-universal", "poc");
    assert.equal(poc.identifier, "com.example.lumina.poc");
    assert.equal(poc.productName, "Lumina POC");
    assert.deepEqual(poc.plugins.updater.endpoints, [POC_ENDPOINT]);
    assert.equal(poc.plugins.updater.dangerousInsecureTransportProtocol, true);
    assert.equal(poc.plugins.updater.dangerousAcceptInvalidCerts, false);
    assert.equal(poc.plugins.updater.pubkey, undefined);
    assert.deepEqual(poc.bundle.targets, ["app", "dmg"]);
    assert.equal(poc.bundle.macOS.signingIdentity, "-");
    assert.equal(
        buildOverrides(base, "macos-universal", "production", "0.1.0-beta.4")
            .bundle.macOS.signingIdentity,
        "-"
    );
    const production = buildOverrides(
        base,
        "windows-x64",
        "production",
        "0.1.0-beta.4"
    );
    assert.deepEqual(production.plugins.updater.endpoints, [
        updaterEndpoint("0.1.0-beta.4"),
    ]);
    assert.equal(production.identifier, undefined);
    assert.deepEqual(production.bundle.targets, ["nsis"]);
    assert.equal(production.bundle.createUpdaterArtifacts, true);
    assert.deepEqual(base, original);
});

test("normal publication requires the complete production matrix and matching version tag", () => {
    const valid = {
        publication: "release",
        mode: "production",
        platform: "all",
        version: "0.1.0-beta.4",
        tag: "v0.1.0-beta.4",
    };
    validatePublication(valid);
    for (const change of [
        {
            mode: "poc",
        },
        {
            platform: "macos-universal",
        },
        {
            tag: "v0.1.0-beta.5",
        },
    ]) {
        assert.throws(() =>
            validatePublication({
                ...valid,
                ...change,
            })
        );
    }
    assert.match(updaterEndpoint("0.1.0-beta.4"), /\/beta.json$/);
    assert.match(updaterEndpoint("0.1.0"), /\/stable.json$/);
});

test("build configuration refuses missing keys, unsafe source endpoints, and a second version authority", () => {
    const missing = structuredClone(base);
    missing.plugins.updater.pubkey = "";
    assert.throws(
        () => buildOverrides(missing, "linux-x64", "poc"),
        /verification key/
    );
    for (const endpoint of [
        "http://example.invalid/feed",
        "https://token@example.invalid/feed",
    ]) {
        const unsafe = structuredClone(base);
        unsafe.plugins.updater.endpoints = [endpoint];
        assert.throws(
            () => buildOverrides(unsafe, "linux-x64", "production"),
            /HTTPS/
        );
    }
    const bypass = structuredClone(base);
    bypass.plugins.updater.dangerousAcceptInvalidCerts = true;
    assert.throws(
        () => buildOverrides(bypass, "linux-x64", "poc"),
        /TLS bypasses/
    );
    assert.throws(
        () =>
            buildOverrides(
                {
                    ...base,
                    version: "0.1.0",
                },
                "linux-x64",
                "poc"
            ),
        /Cargo workspace version/
    );
    assert.throws(
        () => buildOverrides(base, "unknown", "poc"),
        /Unknown installer target/
    );
});

test("collection uploads only installers, signed update packages, and provenance", (context) => {
    const source = mkdtempSync(join(tmpdir(), "lumina-release-"));
    context.after(() =>
        rmSync(source, {
            recursive: true,
            force: true,
        })
    );
    mkdirSync(join(source, "src-tauri"));
    writeFileSync(
        join(source, "Cargo.toml"),
        '[workspace.package]\nversion = "0.1.0-beta.2"\n'
    );
    writeFileSync(
        join(source, "src-tauri/tauri.conf.json"),
        JSON.stringify(base)
    );
    mkdirSync(join(source, "target/bundled-notices"), {
        recursive: true,
    });
    writeFileSync(
        join(source, "target/bundled-notices/THIRD-PARTY-NOTICES.html"),
        "dependency notices"
    );
    for (const [id, target] of Object.entries(TARGETS)) {
        const bundle = join(
            source,
            "target",
            target.rustTarget,
            "release/bundle"
        );
        mkdirSync(join(bundle, target.updaterDirectory), {
            recursive: true,
        });
        mkdirSync(join(bundle, target.installerDirectory), {
            recursive: true,
        });
        const updater = `Lumina POC${target.updaterExtension}`;
        const installer = `Lumina POC${target.installerExtension}`;
        writeFileSync(
            join(bundle, target.updaterDirectory, updater),
            "signed update package"
        );
        writeFileSync(
            join(bundle, target.updaterDirectory, `${updater}.sig`),
            "signature"
        );
        writeFileSync(
            join(bundle, target.installerDirectory, installer),
            "installer"
        );
        writeFileSync(join(bundle, "private-key.key"), "must not be uploaded");
        const output = collectArtifacts(
            source,
            id,
            "poc",
            "test-source-commit"
        );
        const info = JSON.parse(
            readFileSync(join(output, "build-info.json"), "utf8")
        );
        assert.equal(info.version, "0.1.0-beta.2");
        assert.equal(info.sourceCommit, "test-source-commit");
        assert.equal(info.identifier, "com.example.lumina.poc");
        assert.equal(info.updaterPackage, updater);
        assert.equal(readdirSync(output).length, updater === installer ? 4 : 5);
        assert.equal(existsSync(join(output, "private-key.key")), false);
        rmSync(join(bundle, target.updaterDirectory, `${updater}.sig`));
        assert.throws(
            () => collectArtifacts(source, id, "poc", "commit"),
            /sig/
        );
    }
});
