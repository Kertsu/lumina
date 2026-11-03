import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    appendFileSync,
    copyFileSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const POC_HOST = "127.0.0.1";
export const POC_PORT = 4318;
export const POC_ENDPOINT = `http://${POC_HOST}:${POC_PORT}/latest.json`;
export const LINUX_SOURCES = JSON.parse(
    readFileSync(new URL("./linux-appimage.json", import.meta.url), "utf8")
).sourceArchive;

export const TARGETS = {
    "macos-universal": {
        runner: "macos-15",
        rustTarget: "universal-apple-darwin",
        rustTargets: ["aarch64-apple-darwin", "x86_64-apple-darwin"],
        bundles: ["app", "dmg"],
        updaterDirectory: "macos",
        updaterExtension: ".app.tar.gz",
        installerDirectory: "dmg",
        installerExtension: ".dmg",
        platforms: ["darwin-aarch64", "darwin-x86_64"],
        macOS: {
            minimumSystemVersion: "13.3",
            signingIdentity: "-",
        },
    },
    "windows-x64": {
        runner: "windows-2025",
        rustTarget: "x86_64-pc-windows-msvc",
        rustTargets: ["x86_64-pc-windows-msvc"],
        bundles: ["nsis"],
        updaterDirectory: "nsis",
        updaterExtension: ".exe",
        installerDirectory: "nsis",
        installerExtension: ".exe",
        platforms: ["windows-x86_64"],
    },
    "linux-x64": {
        runner: "ubuntu-22.04",
        rustTarget: "x86_64-unknown-linux-gnu",
        rustTargets: ["x86_64-unknown-linux-gnu"],
        bundles: ["appimage"],
        updaterDirectory: "appimage",
        updaterExtension: ".AppImage",
        installerDirectory: "appimage",
        installerExtension: ".AppImage",
        platforms: ["linux-x86_64"],
    },
};

export function targetDefinition(id) {
    if (!Object.hasOwn(TARGETS, id)) {
        throw new Error(`Unknown installer target: ${id}`);
    }
    return TARGETS[id];
}

export function validateVersion(version) {
    const number = "(?:0|[1-9][0-9]*)";
    if (
        typeof version !== "string" ||
        version.trim() !== version ||
        !new RegExp(
            `^${number}\\.${number}\\.${number}(?:-beta\\.${number})?$`
        ).test(version)
    ) {
        throw new Error(
            "Use an application version such as 0.1.0-beta.2 or 0.1.0."
        );
    }
    return version;
}

function workspaceVersionDeclaration(manifest) {
    const section = manifest
        .split(/(?=^\[)/m)
        .find((part) => /^\[workspace\.package\]\r?\n/.test(part));
    const declaration = section?.match(
        /^(version[ \t]*=[ \t]*")([^"]+)("[ \t]*(?:#[^\r\n]*)?\r?)$/m
    );
    if (!declaration) {
        throw new Error("Cargo.toml must declare workspace.package.version.");
    }
    validateVersion(declaration[2]);
    return {
        section,
        declaration,
    };
}

/** Only the Cargo workspace owns the application version. */
export function readWorkspaceVersion(manifest) {
    return workspaceVersionDeclaration(manifest).declaration[2];
}

export function withWorkspaceVersion(manifest, version) {
    const { section, declaration } = workspaceVersionDeclaration(manifest);
    return manifest.replace(
        section,
        section.replace(
            declaration[0],
            `${declaration[1]}${validateVersion(version)}${declaration[3]}`
        )
    );
}

export function updaterEndpoint(version) {
    const channel = validateVersion(version).includes("-beta.")
        ? "beta"
        : "stable";
    return `https://kertsu.github.io/lumina-releases/updates/${channel}.json`;
}

export function validatePublication({
    publication,
    mode,
    platform,
    version,
    tag,
}) {
    if (!["none", "draft", "release"].includes(publication)) {
        throw new Error("Publication must be none, draft, or release.");
    }
    if (publication === "release") {
        if (
            mode !== "production" ||
            platform !== "all" ||
            tag !== `v${validateVersion(version)}`
        ) {
            throw new Error(
                "Tag publication requires every production target and a tag matching the Cargo version."
            );
        }
    } else if (tag) {
        throw new Error("Source tags use normal production publication.");
    }
}

export function buildOverrides(base, targetId, mode, version) {
    const target = targetDefinition(targetId);
    if (mode !== "poc" && mode !== "production") {
        throw new Error("Build mode must be poc or production.");
    }
    const updater = base.plugins?.updater;
    if (base.version !== undefined) {
        throw new Error(
            "Remove the explicit Tauri version and inherit the Cargo workspace version."
        );
    }
    if (!updater?.pubkey?.trim()) {
        throw new Error(
            "Selected source has no updater verification key. Select the beta release line."
        );
    }
    if (
        !updater.endpoints?.length ||
        updater.endpoints.some((endpoint) => {
            const url = new URL(endpoint);
            return url.protocol !== "https:" || url.username || url.password;
        }) ||
        updater.dangerousInsecureTransportProtocol ||
        updater.dangerousAcceptInvalidCerts ||
        updater.dangerousAcceptInvalidHostnames
    ) {
        throw new Error(
            "Source updater endpoints must use HTTPS without URL credentials or TLS bypasses."
        );
    }
    const bundle = {
        targets: target.bundles,
        createUpdaterArtifacts: true,
        resources: {
            ...base.bundle?.resources,
            "../target/bundled-notices/THIRD-PARTY-NOTICES.html":
                "notices/THIRD-PARTY-NOTICES.html",
            "../public/backgrounds/credits.txt": "notices/backgrounds.txt",
        },
    };
    if (target.macOS) {
        bundle.macOS = {
            ...target.macOS,
        };
    }
    if (mode === "production") {
        return {
            plugins: {
                updater: {
                    endpoints: [updaterEndpoint(version)],
                },
            },
            bundle,
        };
    }
    return {
        productName: `${base.productName} POC`,
        identifier: `${base.identifier}.poc`,
        plugins: {
            updater: {
                endpoints: [POC_ENDPOINT],
                dangerousInsecureTransportProtocol: true,
                dangerousAcceptInvalidCerts: false,
                dangerousAcceptInvalidHostnames: false,
            },
        },
        bundle,
    };
}

function run(command, args, source, env = process.env, capture = false) {
    const result = spawnSync(command, args, {
        cwd: source,
        env,
        stdio: capture ? "pipe" : "inherit",
        encoding: "utf8",
    });
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`${command} failed with exit code ${result.status}.`);
    }
    return result.stdout?.trim();
}

function readSource(source) {
    return {
        version: readWorkspaceVersion(
            readFileSync(join(source, "Cargo.toml"), "utf8")
        ),
        config: JSON.parse(
            readFileSync(join(source, "src-tauri/tauri.conf.json"), "utf8")
        ),
    };
}

export function collectArtifacts(source, targetId, mode, sourceCommit) {
    const target = targetDefinition(targetId);
    const { version, config } = readSource(source);
    const overrides = buildOverrides(config, targetId, mode, version);
    const bundles = join(source, "target", target.rustTarget, "release/bundle");
    const singleFile = (directory, extension) => {
        const matches = readdirSync(join(bundles, directory)).filter((name) =>
            name.endsWith(extension)
        );
        if (matches.length !== 1) {
            throw new Error(
                `Expected one ${extension} file in ${directory}; found ${matches.length}.`
            );
        }
        return join(bundles, directory, matches[0]);
    };
    const updater = singleFile(
        target.updaterDirectory,
        target.updaterExtension
    );
    const installer = singleFile(
        target.installerDirectory,
        target.installerExtension
    );
    const signature = `${updater}.sig`;
    if (!readFileSync(signature, "utf8").trim()) {
        throw new Error("The updater signature is empty.");
    }
    const output = join(source, "target/installer-artifacts", targetId);
    rmSync(output, {
        recursive: true,
        force: true,
    });
    mkdirSync(output, {
        recursive: true,
    });
    for (const file of new Set([installer, updater, signature])) {
        copyFileSync(file, join(output, basename(file)));
    }
    copyFileSync(
        join(source, "target/bundled-notices/THIRD-PARTY-NOTICES.html"),
        join(output, "THIRD-PARTY-NOTICES.html")
    );
    let nativeSources;
    if (targetId === "linux-x64") {
        const archive = join(source, "target/linux-native", LINUX_SOURCES);
        const content = readFileSync(archive);
        if (!content.length) {
            throw new Error("Linux third-party sources are empty.");
        }
        copyFileSync(archive, join(output, LINUX_SOURCES));
        nativeSources = {
            filename: LINUX_SOURCES,
            sha256: createHash("sha256").update(content).digest("hex"),
        };
    }
    writeFileSync(
        join(output, "build-info.json"),
        `${JSON.stringify(
            {
                schemaVersion: 1,
                version,
                target: targetId,
                mode,
                sourceCommit,
                identifier: overrides.identifier ?? config.identifier,
                updaterPackage: basename(updater),
                ...(nativeSources
                    ? {
                          nativeSources,
                      }
                    : {}),
                builtAt: new Date().toISOString(),
            },
            null,
            2
        )}\n`
    );
    return output;
}

function output(values) {
    if (process.env.GITHUB_OUTPUT) {
        for (const [name, value] of Object.entries(values)) {
            appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
        }
    } else {
        process.stdout.write(`${JSON.stringify(values, null, 2)}\n`);
    }
}

function main() {
    const {
        values,
        positionals: [command],
    } = parseArgs({
        allowPositionals: true,
        options: {
            source: {
                type: "string",
                default: ".",
            },
            target: {
                type: "string",
            },
            platform: {
                type: "string",
                default: "all",
            },
            mode: {
                type: "string",
                default: "poc",
            },
            version: {
                type: "string",
                default: "",
            },
            publication: {
                type: "string",
                default: "none",
            },
            tag: {
                type: "string",
                default: "",
            },
        },
    });
    const source = resolve(values.source);
    const { version, config } = readSource(source);
    const selected =
        values.platform === "all" ? Object.keys(TARGETS) : [values.platform];
    for (const id of selected) {
        buildOverrides(config, id, values.mode, values.version || version);
    }
    if (
        values.version &&
        (values.mode !== "poc" ||
            !validateVersion(values.version).includes("-beta."))
    ) {
        throw new Error(
            "Version overrides are only allowed for private beta POC builds."
        );
    }
    if (command === "plan") {
        validatePublication({
            publication: values.publication,
            mode: values.mode,
            platform: values.platform,
            version,
            tag: values.tag,
        });
        if (values.publication === "release") {
            const line = version.includes("-beta.") ? "beta" : "main";
            run(
                "git",
                ["merge-base", "--is-ancestor", "HEAD", `origin/${line}`],
                source
            );
        }
        if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
            throw new Error(
                "Configure the source repo secret TAURI_SIGNING_PRIVATE_KEY before building."
            );
        }
        output({
            matrix: JSON.stringify({
                include: selected.map((id) => ({
                    id,
                    runner: targetDefinition(id).runner,
                })),
            }),
            source_sha: run(
                "git",
                ["rev-parse", "HEAD"],
                source,
                process.env,
                true
            ),
            version: values.version || version,
            mode: values.mode,
            publication: values.publication,
        });
        return;
    }
    const target = targetDefinition(values.target);
    const generated = join(source, "target/installer-overrides.json");
    if (command === "prepare") {
        run("rustup", ["target", "add", ...target.rustTargets], source);
        if (values.version && values.version !== version) {
            const cargo = join(source, "Cargo.toml");
            writeFileSync(
                cargo,
                withWorkspaceVersion(
                    readFileSync(cargo, "utf8"),
                    values.version
                )
            );
            run("cargo", ["update", "--workspace"], source);
        }
        mkdirSync(join(source, "target"), {
            recursive: true,
        });
        writeFileSync(
            generated,
            `${JSON.stringify(buildOverrides(config, values.target, values.mode, values.version || version), null, 2)}\n`
        );
        return;
    }
    if (command === "build") {
        if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
            throw new Error("Missing TAURI_SIGNING_PRIVATE_KEY.");
        }
        rmSync(join(source, "target", target.rustTarget, "release/bundle"), {
            recursive: true,
            force: true,
        });
        const env = {
            ...process.env,
        };
        if (target.macOS?.minimumSystemVersion) {
            env.MACOSX_DEPLOYMENT_TARGET = target.macOS.minimumSystemVersion;
        }
        if (target.macOS) {
            // Tauri otherwise skips Finder backgrounds and icon positions on CI.
            env.TAURI_BUNDLER_DMG_IGNORE_CI = "true";
        }
        run(
            process.execPath,
            [
                join(source, "node_modules/@tauri-apps/cli/tauri.js"),
                "build",
                "--target",
                target.rustTarget,
                "--config",
                generated,
                "--",
                "--locked",
            ],
            source,
            env
        );
        if (target.macOS) {
            const directory = join(
                source,
                "target",
                target.rustTarget,
                "release/bundle/macos"
            );
            const applications = readdirSync(directory, {
                withFileTypes: true,
            }).filter(
                (entry) => entry.isDirectory() && entry.name.endsWith(".app")
            );
            if (applications.length !== 1) {
                throw new Error(
                    "Expected one macOS application bundle to verify."
                );
            }
            run(
                "codesign",
                [
                    "--verify",
                    "--deep",
                    "--strict",
                    "--verbose=2",
                    join(directory, applications[0].name),
                ],
                source
            );
        }
        if (values.target === "linux-x64") {
            const cli = join(source, "node_modules/@tauri-apps/cli");
            const cliVersion = JSON.parse(
                readFileSync(join(cli, "package.json"), "utf8")
            ).version;
            run(
                "python3",
                [
                    fileURLToPath(
                        new URL("./linux_appimage.py", import.meta.url)
                    ),
                    "--source",
                    source,
                    "--version",
                    readSource(source).version,
                    "--tauri-version",
                    cliVersion,
                ],
                source,
                env
            );
            const directory = join(
                source,
                "target",
                target.rustTarget,
                "release/bundle/appimage"
            );
            const packages = readdirSync(directory).filter((name) =>
                name.endsWith(".AppImage")
            );
            if (packages.length !== 1) {
                throw new Error("Expected one corrected Linux AppImage.");
            }
            // The payload changed: replace the original updater signature only
            // after the final AppImage and source materials pass inspection.
            run(
                process.execPath,
                [
                    join(cli, "tauri.js"),
                    "signer",
                    "sign",
                    join(directory, packages[0]),
                ],
                source,
                env
            );
            const packagePath = join(directory, packages[0]);
            const verificationKey = join(
                source,
                "target/linux-native/updater.pub"
            );
            const verificationSignature = join(
                source,
                "target/linux-native/updater.minisig"
            );
            writeFileSync(
                verificationKey,
                Buffer.from(config.plugins.updater.pubkey, "base64")
            );
            writeFileSync(
                verificationSignature,
                Buffer.from(
                    readFileSync(`${packagePath}.sig`, "utf8").trim(),
                    "base64"
                )
            );
            run(
                "minisign",
                [
                    "-Vm",
                    packagePath,
                    "-p",
                    verificationKey,
                    "-x",
                    verificationSignature,
                ],
                source
            );
        }
        const artifacts = collectArtifacts(
            source,
            values.target,
            values.mode,
            run("git", ["rev-parse", "HEAD"], source, process.env, true)
        );
        output({
            artifacts,
            version: readWorkspaceVersion(
                readFileSync(join(source, "Cargo.toml"), "utf8")
            ),
        });
        return;
    }
    throw new Error("Expected plan, prepare, or build.");
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
    try {
        main();
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
