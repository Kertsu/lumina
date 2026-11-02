const repository = "https://github.com/Kertsu/lumina-releases";
const labels = {
    "macos-universal": "Download .dmg",
    "windows-x64": "Download .exe",
    "linux-x64": "Download AppImage",
};

/** Only public production asset URLs become download buttons. */
export function validDownloads(value) {
    if (
        !value ||
        typeof value.version !== "string" ||
        !/^\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(value.version)
    ) {
        return false;
    }
    if (value.releaseUrl !== `${repository}/releases/tag/v${value.version}`) {
        return false;
    }
    return Object.keys(labels).every((target) => {
        const installer = value.installers?.[target];
        return (
            typeof installer?.filename === "string" &&
            /^Lumina_[a-zA-Z0-9_.-]+$/.test(installer.filename) &&
            installer.url ===
                `${repository}/releases/download/v${value.version}/${installer.filename}`
        );
    });
}

const platforms = {
    "macos-universal": {
        name: "macOS",
        anchor: "macos",
        note: "macOS 13.3+ · Apple Silicon + Intel",
    },
    "windows-x64": {
        name: "Windows",
        anchor: "windows",
        note: "Windows · x64 installer",
    },
    "linux-x64": {
        name: "Linux",
        anchor: "linux",
        note: "Linux · x64 AppImage",
    },
};

/** Suggest an OS, never assume a mobile or unknown device can run the app. */
export function suggestedPlatform(navigator) {
    const agent = navigator?.userAgent ?? "";
    if (
        /Android|iPhone|iPad|iPod|Mobile/i.test(agent) ||
        (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)
    ) {
        return null;
    }
    if (/Macintosh|Mac OS X/i.test(agent)) {
        return "macos-universal";
    }
    if (/Windows/i.test(agent)) {
        return "windows-x64";
    }
    if (/Linux/i.test(agent) && !/aarch64|armv[5-9]/i.test(agent)) {
        return "linux-x64";
    }
    return null;
}

export async function loadDownloads(
    document,
    fetchCatalog = fetch,
    navigator = globalThis.navigator
) {
    const suggested = suggestedPlatform(navigator);
    const platform = platforms[suggested];
    // Resolve relative to the module so project Pages and /download/ share a base.
    for (const link of document.querySelectorAll("[data-download-auto]")) {
        link.querySelector("[data-download-label]").textContent = platform
            ? `Download for ${platform.name}`
            : "Choose your platform";
        link.href = new URL(
            platform ? `download/#${platform.anchor}` : "download/",
            import.meta.url
        ).href;
    }
    for (const note of document.querySelectorAll("[data-platform-note]")) {
        if (platform) {
            note.textContent = platform.note;
        }
    }
    document
        .querySelector(`[data-download="${suggested}"]`)
        ?.closest(".download-row")
        ?.classList.add("is-recommended");
    try {
        const response = await fetchCatalog(
            new URL("downloads.json", import.meta.url)
        );
        if (!response.ok) {
            return;
        }
        const catalog = await response.json();
        if (!validDownloads(catalog)) {
            return;
        }
        for (const link of document.querySelectorAll(
            "[data-download], [data-download-auto]"
        )) {
            const target = link.hasAttribute("data-download-auto")
                ? suggested
                : link.dataset.download;
            if (!platforms[target]) {
                continue;
            }
            link.href = catalog.installers[target].url;
            link.querySelector("[data-download-label]").textContent =
                link.hasAttribute("data-download-auto")
                    ? `Download for ${platforms[target].name}`
                    : labels[target];
            link.setAttribute(
                "aria-label",
                `${link.querySelector("[data-download-label]").textContent} — ${platforms[target].note}`
            );
        }
        for (const status of document.querySelectorAll("#release-status")) {
            status.textContent = `Version ${catalog.version}`;
        }
        for (const link of document.querySelectorAll("#release-link")) {
            link.href = catalog.releaseUrl;
        }
    } catch {
        // Preparation/offline state keeps platform links and GitHub fallbacks.
    }
}

if (typeof document !== "undefined") {
    void loadDownloads(document);
}
