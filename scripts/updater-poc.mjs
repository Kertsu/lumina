import { createReadStream, lstatSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
    POC_ENDPOINT,
    POC_HOST,
    POC_PORT,
    targetDefinition,
    validateVersion,
} from "./release.mjs";

/** Serve one allowlisted signed artifact, never a directory or repository. */
export function updaterTestServer(directory) {
    const info = JSON.parse(
        readFileSync(join(directory, "build-info.json"), "utf8")
    );
    if (
        info.schemaVersion !== 1 ||
        info.mode !== "poc" ||
        typeof info.identifier !== "string" ||
        !info.identifier.endsWith(".poc")
    ) {
        throw new Error(
            "Select an extracted POC artifact containing build-info.json."
        );
    }
    validateVersion(info.version);
    const target = targetDefinition(info.target);
    const name = info.updaterPackage;
    if (
        typeof name !== "string" ||
        basename(name) !== name ||
        name.includes("\\") ||
        !name.endsWith(target.updaterExtension)
    ) {
        throw new Error(
            "The artifact metadata contains an invalid updater filename."
        );
    }
    const packagePath = join(directory, name);
    const signaturePath = `${packagePath}.sig`;
    const packageInfo = lstatSync(packagePath);
    if (!packageInfo.isFile() || !lstatSync(signaturePath).isFile()) {
        throw new Error("Update package and signature must be regular files.");
    }
    const signature = readFileSync(signaturePath, "utf8").trim();
    if (!signature) {
        throw new Error("Missing updater signature.");
    }
    const assetPath = `/update/${encodeURIComponent(name)}`;
    const manifest = JSON.stringify({
        version: info.version,
        notes: `Private updater rehearsal: ${info.version}.`,
        platforms: Object.fromEntries(
            target.platforms.map((platform) => [
                platform,
                {
                    signature,
                    url: `http://${POC_HOST}:${POC_PORT}${assetPath}`,
                },
            ])
        ),
    });
    const server = createServer((request, response) => {
        if (request.headers.host !== `${POC_HOST}:${server.address().port}`) {
            response.writeHead(403);
            response.end();
            return;
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
            response.writeHead(405, {
                Allow: "GET, HEAD",
            });
            response.end();
            return;
        }
        let path;
        try {
            path = new URL(request.url, POC_ENDPOINT).pathname;
        } catch {
            response.writeHead(400);
            response.end();
            return;
        }
        response.setHeader("Cache-Control", "no-store");
        if (path === "/latest.json") {
            response.writeHead(200, {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(manifest),
            });
            response.end(request.method === "HEAD" ? undefined : manifest);
        } else if (path === assetPath) {
            response.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Length": packageInfo.size,
            });
            if (request.method === "HEAD") {
                response.end();
            } else {
                createReadStream(packagePath)
                    .on("error", () => response.destroy())
                    .pipe(response);
            }
        } else {
            response.writeHead(404);
            response.end();
        }
    });
    return {
        server,
        info,
    };
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
    try {
        if (process.argv.length !== 3) {
            throw new Error(
                "Usage: pnpm updater:poc /path/to/extracted-poc-artifact"
            );
        }
        const { server, info } = updaterTestServer(resolve(process.argv[2]));
        server.once("error", (error) => {
            process.stderr.write(`${error.message}\n`);
            process.exitCode = 1;
        });
        server.listen(POC_PORT, POC_HOST, () => {
            process.stdout.write(
                `Serving ${info.version} (${info.target}) at ${POC_ENDPOINT}\nStart or restart Lumina POC beta.1 to check for updates. Press Ctrl+C to stop.\n`
            );
        });
        process.once("SIGINT", () => {
            server.closeAllConnections();
            server.close();
        });
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
