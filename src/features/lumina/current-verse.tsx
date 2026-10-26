import {
    ChevronLeft,
    ChevronRight,
    Copy,
    Info,
    Maximize2,
    Monitor,
    Palette,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import { useDeskContext } from "./desk-context";
import type { TranslationId } from "./fixtures";
import { referenceLabel } from "./fixtures";
import { IconButton } from "./icon-button";
import { graphemeCount } from "./model";
import { VerseSlide } from "./verse-slide";
export function CurrentVerse() {
    const {
        workspace,
        translations,
        installed,
        setAppearanceOpen,
        setInformationOpen,
        notify,
        isInstalled,
        previewVerse,
        navigate,
        current,
        band,
        savedCopy,
        changeTranslation,
    } = useDeskContext();
    return (
        <>
            {" "}
            <section
                className="projection-stage"
                aria-label="Current verse projection"
            >
                <div className="stage-canvas">
                    <VerseSlide
                        verse={current}
                        appearance={workspace.appearance}
                    />
                </div>
                <div className="stage-bottom">
                    <span>
                        <Monitor />
                        {workspace.information
                            ? "Retained verse"
                            : workspace.status === "live"
                              ? "On audience"
                              : "Retained verse"}
                        <span className="stage-aspect">16:9</span>
                    </span>
                    <div>
                        <IconButton
                            label="Slide appearance"
                            onClick={() => setAppearanceOpen(true)}
                        >
                            <Palette />
                        </IconButton>
                        <IconButton
                            label="Copy current verse"
                            onClick={() => {
                                if (!current) {
                                    return;
                                }
                                void navigator.clipboard
                                    .writeText(
                                        `${current.text}\n${referenceLabel(current)} — ${translations.find((item) => item.id === current.translation)?.name}`
                                    )
                                    .then(
                                        () => notify("Verse copied"),
                                        () =>
                                            notify(
                                                "Clipboard unavailable. Try copying from the verse preview."
                                            )
                                    );
                            }}
                        >
                            <Copy />
                        </IconButton>
                        <IconButton
                            label="Inspect current slide"
                            onClick={() => {
                                if (current) {
                                    previewVerse(current);
                                }
                            }}
                        >
                            <Maximize2 />
                        </IconButton>
                    </div>
                </div>
            </section>
            <div className="current-details">
                <div>
                    <div className="reference-heading">
                        <h2>
                            {current
                                ? referenceLabel(current)
                                : "Ready when you are."}
                        </h2>
                        <IconButton
                            label="Book information · F7"
                            onClick={() => setInformationOpen(true)}
                            active={workspace.information}
                        >
                            <Info />
                        </IconButton>
                        {savedCopy && (
                            <span className="info-badge">Saved copy</span>
                        )}
                    </div>
                    <p>
                        {current ? (
                            <>
                                {graphemeCount(current.text)} characters
                                <span className="detail-dot" />
                                {band?.size}px size band
                                <span className="detail-dot" />
                                {
                                    translations.find(
                                        (item) =>
                                            item.id === current.translation
                                    )?.name
                                }
                            </>
                        ) : (
                            "Find a reference or search the words you remember."
                        )}
                    </p>
                </div>
                <div className="current-actions">
                    <Select
                        value={current?.translation ?? workspace.translation}
                        onValueChange={(id: TranslationId) =>
                            changeTranslation(id)
                        }
                        disabled={!current}
                    >
                        <SelectTrigger
                            aria-label="Change current verse translation"
                            className="current-translation"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {translations
                                .filter((item) => installed.includes(item.id))
                                .map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.shortName}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <div className="navigation-pair">
                        <Button
                            variant="outline"
                            disabled={!current || !isInstalled(current)}
                            onClick={() => navigate(-1)}
                        >
                            <ChevronLeft />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            disabled={!current || !isInstalled(current)}
                            onClick={() => navigate(1)}
                        >
                            Next
                            <ChevronRight />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
