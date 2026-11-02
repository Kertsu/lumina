import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import {
    loadDownloads,
    suggestedPlatform,
    validDownloads,
} from "../docs/releases/public/docs/downloads.mjs";

test("suggest the matching desktop platform without choosing a Mac architecture", () => {
    for (const [userAgent, expected] of [
        ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)", "macos-universal"],
        ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "windows-x64"],
        ["Mozilla/5.0 (X11; Linux x86_64)", "linux-x64"],
    ]) {
        assert.equal(
            suggestedPlatform({
                userAgent,
            }),
            expected
        );
    }
});

test("mobile, iPad desktop mode, ARM Linux and unknown devices get the chooser", () => {
    for (const navigator of [
        {
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile",
        },
        {
            userAgent: "Mozilla/5.0 (Linux; Android 15)",
        },
        {
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
            maxTouchPoints: 5,
        },
        {
            userAgent: "Mozilla/5.0 (X11; Linux aarch64)",
        },
        {
            userAgent: "unknown",
        },
        undefined,
    ]) {
        assert.equal(suggestedPlatform(navigator), null);
    }
});

test("preparing, incomplete and off-site catalogs never become direct downloads", () => {
    assert.equal(
        validDownloads({
            status: "preparing",
        }),
        false
    );
    const repository = "https://github.com/Kertsu/lumina-releases";
    const catalog = {
        version: "0.1.0-beta.4",
        releaseUrl: `${repository}/releases/tag/v0.1.0-beta.4`,
        installers: {},
    };
    assert.equal(validDownloads(catalog), false);
    for (const target of ["macos-universal", "windows-x64", "linux-x64"]) {
        const filename = `Lumina_0.1.0-beta.4_${target}`;
        catalog.installers[target] = {
            filename,
            url: `${repository}/releases/download/v0.1.0-beta.4/${filename}`,
        };
    }
    assert.equal(validDownloads(catalog), true);
    catalog.installers["macos-universal"].url =
        "https://example.org/installer.dmg";
    assert.equal(validDownloads(catalog), false);
});

test("real download markup keeps labels, app icons and installer links independent", async () => {
    const repository = "https://github.com/Kertsu/lumina-releases";
    const version = "0.1.0-beta.4";
    const catalog = {
        version,
        releaseUrl: `${repository}/releases/tag/v${version}`,
        installers: {},
    };
    for (const target of ["macos-universal", "windows-x64", "linux-x64"]) {
        const filename = `Lumina_${version}_${target}`;
        catalog.installers[target] = {
            filename,
            url: `${repository}/releases/download/v${version}/${filename}`,
        };
    }
    for (const name of ["index.html", "download/index.html"]) {
        const dom = new JSDOM(
            readFileSync(
                new URL(
                    `../docs/releases/public/docs/${name}`,
                    import.meta.url
                ),
                "utf8"
            ),
            {
                url: `https://kertsu.github.io/lumina-releases/${name}`,
            }
        );
        await loadDownloads(
            dom.window.document,
            async () => ({
                ok: true,
                json: async () => catalog,
            }),
            {
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
            }
        );
        const document = dom.window.document;
        for (const link of document.querySelectorAll("[data-download-auto]")) {
            assert.equal(
                link.querySelector("[data-download-label]").textContent,
                "Download for macOS"
            );
            assert.equal(link.href, catalog.installers["macos-universal"].url);
        }
        for (const link of document.querySelectorAll("[data-download]")) {
            assert.equal(
                link.href,
                catalog.installers[link.dataset.download].url
            );
            assert.ok(link.querySelector(".installer-icon"));
            assert.match(
                link.querySelector("[data-download-label]").textContent,
                /^Download/
            );
        }
        dom.window.close();
    }
});
