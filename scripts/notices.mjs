import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { targetDefinition } from "./release.mjs";

const LICENSE_DIRECTORY = join(
    dirname(fileURLToPath(import.meta.url)),
    "licenses"
);

const JAVASCRIPT_LICENSES = new Set([
    "MIT",
    "OFL-1.1",
    "Apache-2.0 OR MIT",
    "MIT OR Apache-2.0",
    "Apache-2.0",
    "ISC",
    "Unlicense",
    "MPL-2.0",
    "BSD-3-Clause",
    "0BSD",
]);

function capture(command, args, source, shell = false) {
    const result = spawnSync(command, args, {
        cwd: source,
        encoding: "utf8",
        shell,
        maxBuffer: 32 * 1024 * 1024,
    });
    if (result.error || result.status !== 0) {
        throw new Error(
            result.error?.message ?? result.stderr ?? `${command} failed.`
        );
    }
    return result.stdout;
}

function htmlEscape(value) {
    return String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[character]
    );
}

function licenseFiles(directory) {
    return readdirSync(directory, {
        withFileTypes: true,
    })
        .filter(
            (entry) =>
                entry.isFile() &&
                /^(licen[cs]e|copying|notice|copyright|unlicense)/i.test(
                    entry.name
                )
        )
        .map((entry) => readFileSync(join(directory, entry.name), "utf8"));
}

export function javascriptNotices(report) {
    const packages = Object.values(report).flat();
    return packages.flatMap((item) =>
        item.paths.map((path) => {
            if (!JAVASCRIPT_LICENSES.has(item.license)) {
                throw new Error(
                    `Review the new dependency license before release: ${item.name} (${item.license}).`
                );
            }
            const metadata = JSON.parse(
                readFileSync(join(path, "package.json"), "utf8")
            );
            let texts = licenseFiles(path);
            // Platform tool packages share the license of the same-version upstream tool.
            const parent = item.name.startsWith("@esbuild/")
                ? "esbuild"
                : item.name.startsWith("@rolldown/binding-")
                  ? "rolldown"
                  : undefined;
            if (!texts.length && parent) {
                const upstream = packages.find(
                    (entry) =>
                        entry.name === parent &&
                        entry.versions.includes(metadata.version)
                );
                if (upstream) {
                    texts = upstream.paths.flatMap(licenseFiles);
                }
            }
            if (
                !texts.length &&
                item.name === "react-remove-scroll-bar" &&
                metadata.version === "2.3.8"
            ) {
                const clarification = JSON.parse(
                    readFileSync(
                        join(
                            LICENSE_DIRECTORY,
                            "react-remove-scroll-bar-2.3.8.json"
                        )
                    )
                );
                const text = readFileSync(
                    join(
                        LICENSE_DIRECTORY,
                        "react-remove-scroll-bar-2.3.8-LICENSE"
                    )
                );
                if (
                    createHash("sha256").update(text).digest("hex") !==
                    clarification.sha256
                ) {
                    throw new Error(
                        "Dependency license clarification checksum mismatch."
                    );
                }
                texts = [
                    `Source: ${clarification.source}\n${clarification.reason}\n\n${text}`,
                ];
            }
            if (!texts.length) {
                throw new Error(
                    `Missing license text for ${item.name}@${metadata.version}.`
                );
            }
            return {
                name: `${item.name}@${metadata.version}`,
                license: item.license,
                source: `https://www.npmjs.com/package/${item.name}/v/${metadata.version}`,
                texts,
            };
        })
    );
}

export function renderNotices(javascript, rust, additional = "") {
    const entries = [
        ...javascript,
        ...rust.licenses.map((license) => ({
            name: license.used_by
                .map(({ crate }) => `${crate.name}@${crate.version}`)
                .join(", "),
            license: license.id,
            source: license.used_by
                .map(
                    ({ crate }) =>
                        `https://crates.io/api/v1/crates/${crate.name}/${crate.version}/download`
                )
                .join("\n"),
            texts: [license.text],
        })),
    ];
    if (
        !javascript.length ||
        !rust.licenses.length ||
        entries.some(
            (entry) =>
                !entry.license || entry.texts.some((text) => !text.trim())
        )
    ) {
        throw new Error("Incomplete dependency license report.");
    }
    const sections = entries
        .map(
            (entry) =>
                `<section><h2>${htmlEscape(entry.name)}</h2><p>${htmlEscape(entry.license)}</p><pre>${htmlEscape(entry.source)}</pre>${entry.texts.map((text) => `<pre>${htmlEscape(text)}</pre>`).join("\n")}</section>`
        )
        .join("\n");
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lumina third-party notices</title><style>body{font:16px/1.6 system-ui;max-width:76ch;margin:3rem auto;padding:0 1.5rem}section{border-top:1px solid #aaa;margin-top:3rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}h2{overflow-wrap:anywhere}</style><h1>Lumina third-party notices</h1><p>These components retain their own licenses. The inventory includes production dependency trees, including some tools that may not be incorporated in the final app. Unmodified covered source is available at the versioned source locations below. Lumina's freeware terms do not restrict third-party rights.</p><pre>${htmlEscape(additional)}</pre>${sections}</html>\n`;
}

function main() {
    const { values } = parseArgs({
        options: {
            source: {
                type: "string",
                default: ".",
            },
            target: {
                type: "string",
            },
        },
    });
    const source = resolve(values.source);
    const target = targetDefinition(values.target);
    const output = join(source, "target/bundled-notices");
    mkdirSync(output, {
        recursive: true,
    });
    const rustPath = join(output, "rust-licenses.private.json");
    capture(
        "cargo-about",
        [
            "generate",
            "--locked",
            "--workspace",
            "--fail",
            "--format",
            "json",
            "--config",
            join(LICENSE_DIRECTORY, "about.toml"),
            ...target.rustTargets.flatMap((triple) => ["--target", triple]),
            "--output-file",
            rustPath,
        ],
        source
    );
    // Fixed arguments only; pnpm.cmd requires a shell on Windows.
    const javascript = JSON.parse(
        capture(
            "pnpm",
            ["licenses", "list", "--prod", "--json"],
            source,
            process.platform === "win32"
        )
    );
    const bible = JSON.parse(
        readFileSync(
            join(source, "crates/lumina-persistence/seed/provenance.json")
        )
    );
    if (!bible.rights_notice || !bible.source_url) {
        throw new Error(
            "Bundled Bible provenance must include its rights notice and source."
        );
    }
    const materialNotices = `Bundled background photographs\n\n${readFileSync(join(source, "public/backgrounds/credits.txt"), "utf8")}\n\nBundled World English Bible\n\n${bible.rights_notice}\nSource: ${bible.source_url}\nThe original publisher notice and provenance accompany the application.\n`;
    const html = renderNotices(
        javascriptNotices(javascript),
        JSON.parse(readFileSync(rustPath)),
        materialNotices
    );
    writeFileSync(join(output, "THIRD-PARTY-NOTICES.html"), html);
    process.stdout.write(
        `Generated ${values.target} third-party notices (${Buffer.byteLength(html)} bytes).\n`
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
