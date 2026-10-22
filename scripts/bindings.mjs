import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const committed = join(root, "src/bridge/bindings.gen.ts");
const temporary = mkdtempSync(join(tmpdir(), "lumina-bindings-"));
const generated = join(temporary, "bindings.ts");

function generateBindings() {
    const result = spawnSync(
        "cargo",
        [
            "run",
            "--locked",
            "-p",
            "Lumina",
            "--bin",
            "bindings",
            "--",
            generated,
        ],
        {
            cwd: root,
            stdio: "inherit",
        }
    );
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        return;
    }

    const formatted = spawnSync(
        process.execPath,
        [
            join(root, "node_modules/@biomejs/biome/bin/biome"),
            "format",
            "--stdin-file-path=bindings.ts",
        ],
        {
            cwd: root,
            input: readFileSync(generated, "utf8"),
            encoding: "utf8",
        }
    );
    if (formatted.error) {
        throw formatted.error;
    }
    if (formatted.status !== 0) {
        throw new Error(formatted.stderr);
    }
    const output = formatted.stdout;
    if (!process.argv.includes("--check")) {
        writeFileSync(committed, output);
        return;
    }

    let existing;
    try {
        existing = readFileSync(committed, "utf8");
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
    if (existing !== output) {
        process.stderr.write(
            "Stale Rust bindings: run pnpm bindings:generate, then pnpm typecheck.\n"
        );
        process.exitCode = 1;
    }
}

try {
    generateBindings();
} finally {
    rmSync(temporary, {
        recursive: true,
        force: true,
    });
}
