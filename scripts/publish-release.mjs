import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    lstatSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { TARGETS, targetDefinition, validateVersion } from "./release.mjs";

export const RELEASE_REPOSITORY = "Kertsu/lumina-releases";
export const PUBLIC_FILES = {
    "README.md": "README.md",
    "INSTALL.md": "INSTALL.md",
    "GUIDE.md": "GUIDE.md",
    "IMPORT.md": "IMPORT.md",
    "PRIVACY.md": "PRIVACY.md",
    // Application terms have one authority at the private repository root.
    LICENSE: "../../../LICENSE",
    "THIRD_PARTY.md": "THIRD_PARTY.md",
    ".github/ISSUE_TEMPLATE/bug_report.yml":
        ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/config.yml": ".github/ISSUE_TEMPLATE/config.yml",
    "docs/.nojekyll": "docs/.nojekyll",
    "docs/index.html": "docs/index.html",
    "docs/download/index.html": "docs/download/index.html",
    "docs/404.html": "docs/404.html",
    "docs/style.css": "docs/style.css",
    "docs/downloads.mjs": "docs/downloads.mjs",
    "docs/assets/lumina-icon.png": "docs/assets/lumina-icon.png",
    "docs/assets/walkthrough.mp4": "docs/assets/walkthrough.mp4",
    "docs/assets/walkthrough.jpg": "docs/assets/walkthrough.jpg",
    "docs/assets/GeistSans.woff2": "docs/assets/GeistSans.woff2",
    "docs/assets/Geist-OFL.txt": "docs/assets/Geist-OFL.txt",
    "docs/assets/CREDITS.txt": "docs/assets/CREDITS.txt",
    "docs/assets/Phosphor-LICENSE.txt": "docs/assets/Phosphor-LICENSE.txt",
    "docs/assets/operator-john.jpg": "docs/assets/operator-john.jpg",
    "docs/assets/audience-john.jpg": "docs/assets/audience-john.jpg",
    "docs/assets/operator-search.jpg": "docs/assets/operator-search.jpg",
    "docs/assets/operator-preview.jpg": "docs/assets/operator-preview.jpg",
    "notices/WEB-NOTICE.html": "notices/WEB-NOTICE.html",
    "notices/WEB-provenance.json": "notices/WEB-provenance.json",
};

function regularFile(path) {
    if (!lstatSync(path).isFile()) {
        throw new Error(`Expected a regular file: ${path}`);
    }
    return readFileSync(path);
}

function assetName(name) {
    if (
        typeof name !== "string" ||
        name !== basename(name) ||
        name.includes("\\") ||
        [...name].some(
            (character) =>
                character.codePointAt(0) < 32 ||
                character.codePointAt(0) === 127
        ) ||
        name.startsWith("-")
    ) {
        throw new Error("Invalid release asset filename.");
    }
    return name;
}

/** Only collected packages enter a release; repository files never do. */
export function preparePublication(directories, publication, notes) {
    if (publication !== "draft" && publication !== "release") {
        throw new Error("Publication must be draft or release.");
    }
    const assets = new Map();
    const platforms = {};
    const installers = {};
    const targets = new Set();
    let identity;
    const add = (name, contents) => {
        if (assets.has(name)) {
            throw new Error(`Duplicate release asset: ${name}`);
        }
        assets.set(name, contents);
    };
    for (const directory of directories) {
        const info = JSON.parse(
            regularFile(join(directory, "build-info.json"))
        );
        validateVersion(info.version);
        const target = targetDefinition(info.target);
        const expectedIdentifier = `com.kurtddanielbigtas.lumina${info.mode === "poc" ? ".poc" : ""}`;
        if (
            info.schemaVersion !== 1 ||
            !["poc", "production"].includes(info.mode) ||
            info.identifier !== expectedIdentifier ||
            !/^[a-f0-9]{40}$/.test(info.sourceCommit)
        ) {
            throw new Error(
                "Invalid build provenance or application identity."
            );
        }
        const current = JSON.stringify([
            info.version,
            info.mode,
            info.sourceCommit,
        ]);
        if (identity && current !== identity) {
            throw new Error(
                "All packages must have the same version, mode, and source commit."
            );
        }
        identity = current;
        if (targets.has(info.target)) {
            throw new Error(`Duplicate build target: ${info.target}`);
        }
        targets.add(info.target);
        const updater = assetName(info.updaterPackage);
        if (!updater.endsWith(target.updaterExtension)) {
            throw new Error(
                "Updater package extension does not match its target."
            );
        }
        const installerFiles = readdirSync(directory).filter((name) =>
            name.endsWith(target.installerExtension)
        );
        if (installerFiles.length !== 1) {
            throw new Error("Expected exactly one installer per build target.");
        }
        const allowed = new Set([
            "build-info.json",
            updater,
            `${updater}.sig`,
            assetName(installerFiles[0]),
        ]);
        const notices = join(directory, "THIRD-PARTY-NOTICES.html");
        if (readdirSync(directory).includes("THIRD-PARTY-NOTICES.html")) {
            allowed.add("THIRD-PARTY-NOTICES.html");
            const contents = regularFile(notices);
            if (!contents.length) {
                throw new Error("Empty third-party notices.");
            }
            add(`THIRD-PARTY-NOTICES-${info.target}.html`, contents);
        } else if (publication === "release") {
            throw new Error(
                "Production publication requires bundled dependency notices."
            );
        }
        if (readdirSync(directory).some((name) => !allowed.has(name))) {
            throw new Error(
                "Unexpected file in installer artifact; refusing publication."
            );
        }
        const prefix = `Lumina${info.mode === "poc" ? "_POC" : ""}_${info.version}_${info.target}`;
        const updaterAsset = `${prefix}${target.updaterExtension}`;
        const installerAsset = `${prefix}${target.installerExtension}`;
        installers[info.target] = {
            filename: installerAsset,
        };
        add(updaterAsset, regularFile(join(directory, updater)));
        add(
            `${updaterAsset}.sig`,
            regularFile(join(directory, `${updater}.sig`))
        );
        if (installerAsset !== updaterAsset) {
            add(
                installerAsset,
                regularFile(join(directory, installerFiles[0]))
            );
        }
        add(
            `build-info-${info.target}.json`,
            Buffer.from(
                `${JSON.stringify(
                    {
                        ...info,
                        installerAsset,
                        updaterAsset,
                    },
                    null,
                    2
                )}\n`
            )
        );
        const signature = assets
            .get(`${updaterAsset}.sig`)
            .toString("utf8")
            .trim();
        if (!signature) {
            throw new Error("Missing updater signature.");
        }
        for (const platform of target.platforms) {
            platforms[platform] = {
                signature,
                asset: updaterAsset,
            };
        }
    }
    if (!identity) {
        throw new Error("No installer artifacts found.");
    }
    const [version, mode, sourceCommit] = JSON.parse(identity);
    if (
        publication === "release" &&
        (mode !== "production" || targets.size !== Object.keys(TARGETS).length)
    ) {
        throw new Error(
            "Public releases require production packages for every target."
        );
    }
    const tag = `${publication === "draft" ? "rehearsal-" : ""}v${version}`;
    const manifest = {
        version,
        notes,
        platforms: Object.fromEntries(
            Object.entries(platforms).map(([platform, value]) => [
                platform,
                {
                    signature: value.signature,
                    url: `https://github.com/${RELEASE_REPOSITORY}/releases/download/${tag}/${encodeURIComponent(value.asset)}`,
                },
            ])
        ),
    };
    const downloads = {
        version,
        releaseUrl: `https://github.com/${RELEASE_REPOSITORY}/releases/tag/${tag}`,
        installers: Object.fromEntries(
            Object.entries(installers).map(([target, value]) => [
                target,
                {
                    ...value,
                    url: `https://github.com/${RELEASE_REPOSITORY}/releases/download/${tag}/${value.filename}`,
                },
            ])
        ),
    };
    add("updater.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
    add(
        "downloads.json",
        Buffer.from(`${JSON.stringify(downloads, null, 2)}\n`)
    );
    add(
        "SHA256SUMS",
        Buffer.from(
            `${[...assets]
                .map(
                    ([name, content]) =>
                        `${createHash("sha256").update(content).digest("hex")}  ${name}`
                )
                .join("\n")}\n`
        )
    );
    return {
        version,
        mode,
        sourceCommit,
        tag,
        manifest,
        downloads,
        assets,
    };
}

function gh(args, input) {
    const result = spawnSync("gh", args, {
        input: input === undefined ? undefined : JSON.stringify(input),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
    });
    if (result.error || result.status !== 0) {
        throw new Error(result.error?.message ?? result.stderr.trim());
    }
    return result.stdout.trim();
}

function api(path, method = "GET", body) {
    return JSON.parse(
        gh(
            [
                "api",
                `repos/${RELEASE_REPOSITORY}${path ? `/${path}` : ""}`,
                "--method",
                method,
                ...(body === undefined ? [] : ["--input", "-"]),
            ],
            body
        )
    );
}

/** One destination commit keeps both channels and public docs consistent. */
export function publicContent(directory, manifest) {
    const files = new Map(
        Object.entries(PUBLIC_FILES).map(([destination, source]) => [
            destination,
            regularFile(join(directory, source)),
        ])
    );
    if (manifest) {
        const content = `${JSON.stringify(manifest, null, 2)}\n`;
        files.set("docs/updates/beta.json", content);
        if (!manifest.version.includes("-beta.")) {
            files.set("docs/updates/stable.json", content);
        }
    }
    return files;
}

export function compareVersions(left, right) {
    const parts = (version) => {
        validateVersion(version);
        const [core, beta] = version.split("-beta.");
        return {
            core: core.split(".").map(BigInt),
            beta: beta === undefined ? undefined : BigInt(beta),
        };
    };
    const a = parts(left);
    const b = parts(right);
    for (let index = 0; index < 3; index++) {
        if (a.core[index] !== b.core[index]) {
            return a.core[index] > b.core[index] ? 1 : -1;
        }
    }
    if (a.beta === b.beta) {
        return 0;
    }
    if (a.beta === undefined || b.beta === undefined) {
        return a.beta === undefined ? 1 : -1;
    }
    return a.beta > b.beta ? 1 : -1;
}

function readFeed(channel) {
    try {
        const file = api(`contents/docs/updates/${channel}.json?ref=main`);
        return JSON.parse(Buffer.from(file.content, "base64"));
    } catch (error) {
        if (error.message.includes("HTTP 404")) {
            return undefined;
        }
        throw error;
    }
}

function syncContent(files, message) {
    let head;
    try {
        head = api("git/ref/heads/main").object.sha;
    } catch (error) {
        if (!/HTTP (404|409)/.test(error.message)) {
            throw error;
        }
        api("contents/README.md", "PUT", {
            message: "docs: initialize Lumina release repository",
            branch: "main",
            content: Buffer.from(files.get("README.md")).toString("base64"),
        });
        head = api("git/ref/heads/main").object.sha;
    }
    const commit = api(`git/commits/${head}`);
    const current = api(`git/trees/${commit.tree.sha}?recursive=1`);
    const changes = [];
    for (const [path, value] of files) {
        const content = Buffer.from(value);
        const sha = createHash("sha1")
            .update(Buffer.from(`blob ${content.length}\0`))
            .update(content)
            .digest("hex");
        if (
            current.tree.some(
                (entry) => entry.path === path && entry.sha === sha
            )
        ) {
            continue;
        }
        const blob = api("git/blobs", "POST", {
            encoding: "base64",
            content: content.toString("base64"),
        });
        changes.push({
            path,
            mode: "100644",
            type: "blob",
            sha: blob.sha,
        });
    }
    if (!changes.length) {
        return head;
    }
    const tree = api("git/trees", "POST", {
        base_tree: commit.tree.sha,
        tree: changes,
    });
    if (tree.sha === commit.tree.sha) {
        return head;
    }
    const next = api("git/commits", "POST", {
        message,
        tree: tree.sha,
        parents: [head],
    });
    api("git/refs/heads/main", "PATCH", {
        sha: next.sha,
        force: false,
    });
    return next.sha;
}

function main() {
    const { values } = parseArgs({
        options: {
            docs: {
                type: "string",
            },
            artifacts: {
                type: "string",
            },
            publication: {
                type: "string",
                default: "draft",
            },
            "source-commit": {
                type: "string",
            },
            version: {
                type: "string",
            },
            notes: {
                type: "string",
            },
            "sync-docs": {
                type: "boolean",
                default: false,
            },
            message: {
                type: "string",
            },
        },
    });
    const docs = resolve(values.docs);
    if (values["sync-docs"]) {
        const message = values.message?.trim();
        if (!message) {
            throw new Error(
                "Documentation sync requires --message describing the change."
            );
        }
        const files = publicContent(docs);
        try {
            api("contents/docs/downloads.json?ref=main");
        } catch (error) {
            if (!/HTTP (404|409)/.test(error.message)) {
                throw error;
            }
            files.set(
                "docs/downloads.json",
                `${JSON.stringify(
                    {
                        status: "preparing",
                    },
                    null,
                    2
                )}\n`
            );
        }
        syncContent(files, message);
        process.stdout.write(
            `Prepared private release docs: https://github.com/${RELEASE_REPOSITORY}\n`
        );
        return;
    }
    const root = resolve(values.artifacts);
    const directories = readdirSync(root).map((name) => join(root, name));
    if (directories.some((path) => !lstatSync(path).isDirectory())) {
        throw new Error(
            "Expected one extracted artifact directory per target."
        );
    }
    const notes = values.notes
        ? regularFile(resolve(values.notes)).toString("utf8")
        : "Private build/upload rehearsal. These packages are not public beta downloads.";
    if (values.publication === "release" && !values.notes) {
        throw new Error("Public publication requires versioned release notes.");
    }
    const release = preparePublication(directories, values.publication, notes);
    if (
        release.version !== values.version ||
        release.sourceCommit !== values["source-commit"]
    ) {
        throw new Error(
            "Downloaded artifacts do not match the workflow's pinned version and source."
        );
    }
    const repository = api("");
    if (
        values.publication === "release" &&
        (repository.private || !repository.has_pages)
    ) {
        throw new Error(
            "Launch requires a public releases repository with Pages enabled. Use draft rehearsal until ready."
        );
    }
    const channel = release.version.includes("-beta.") ? "beta" : "stable";
    const previous =
        values.publication === "release" ? readFeed(channel) : undefined;
    if (previous && compareVersions(release.version, previous.version) <= 0) {
        throw new Error(
            "Refusing to move an update feed to an equal or older version."
        );
    }
    const existing = JSON.parse(
        gh([
            "api",
            "--paginate",
            "--slurp",
            `repos/${RELEASE_REPOSITORY}/releases`,
        ])
    ).flat();
    if (existing.some((item) => item.tag_name === release.tag)) {
        throw new Error(
            "That destination release already exists; never replace shipped binaries."
        );
    }
    const docsCommit = syncContent(
        publicContent(docs),
        `docs: prepare ${release.version} release files`
    );
    const created = api("releases", "POST", {
        tag_name: release.tag,
        target_commitish: docsCommit,
        name: `Lumina ${release.version}${values.publication === "draft" ? " — private rehearsal" : ""}`,
        body: notes,
        draft: true,
        prerelease: release.version.includes("-beta."),
    });
    const staging = join(root, ".publication");
    mkdirSync(staging);
    for (const [name, contents] of release.assets) {
        writeFileSync(join(staging, name), contents);
    }
    gh([
        "release",
        "upload",
        release.tag,
        "--repo",
        RELEASE_REPOSITORY,
        ...[...release.assets.keys()].map((name) => join(staging, name)),
    ]);
    if (values.publication === "release") {
        api(`releases/${created.id}`, "PATCH", {
            draft: false,
            make_latest: release.version.includes("-beta.") ? "false" : "true",
        });
        const files = publicContent(docs, release.manifest);
        if (channel === "stable" || !readFeed("stable")) {
            files.set(
                "docs/downloads.json",
                `${JSON.stringify(release.downloads, null, 2)}\n`
            );
        }
        if (channel === "stable") {
            const beta = readFeed("beta");
            if (beta && compareVersions(release.version, beta.version) < 0) {
                files.delete("docs/updates/beta.json");
            }
        }
        syncContent(files, `release: publish ${release.version} update feeds`);
    }
    process.stdout.write(
        `${values.publication === "draft" ? "Draft uploaded; feeds unchanged" : "Published release and feeds"}: ${created.html_url}\n`
    );
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
