import {
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Info,
    Maximize2,
    Monitor,
    Palette,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
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
    const [copied, setCopied] = useState(false);
    const translationId = useId();
    const {
        workspace,
        translations,
        installed,
        setAppearanceOpen,
        showInformation,
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
                              ? workspace.projectionOutcome === "projected"
                                  ? "On audience"
                                  : workspace.projectionOutcome ===
                                      "unconfirmed"
                                    ? "Unconfirmed projection"
                                    : workspace.projectionOutcome ===
                                        "awaitingConfirmation"
                                      ? "Awaiting confirmation"
                                      : "Audience output requested"
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
                            className={
                                copied
                                    ? "copy-current-verse copied"
                                    : "copy-current-verse"
                            }
                            onClick={() => {
                                if (!current) {
                                    return;
                                }
                                void navigator.clipboard
                                    .writeText(
                                        `${current.text}\n${referenceLabel(current)} — ${current.translationTitle ?? translations.find((item) => item.id === current.translation)?.name ?? current.translation}`
                                    )
                                    .then(
                                        () => {
                                            setCopied(true);
                                            window.setTimeout(
                                                () => setCopied(false),
                                                2000
                                            );
                                        },
                                        () =>
                                            toast.error(
                                                "Clipboard unavailable. Try copying from the verse preview."
                                            )
                                    );
                            }}
                        >
                            {copied ? <Check /> : <Copy />}
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
                                : "No verse selected"}
                        </h2>
                        <IconButton
                            label="Book information · F7"
                            onClick={showInformation}
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
                                {current.translationTitle ??
                                    translations.find(
                                        (item) =>
                                            item.id === current.translation
                                    )?.name ??
                                    current.translation}
                            </>
                        ) : (
                            "Enter a reference or search for a verse."
                        )}
                    </p>
                </div>
                <div className="current-actions">
                    <div className="display-translation">
                        <label htmlFor={translationId}>
                            Display translation
                        </label>
                        <Select
                            value={
                                current?.translation ?? workspace.translation
                            }
                            onValueChange={(id: TranslationId) =>
                                changeTranslation(id)
                            }
                            disabled={!current}
                        >
                            <SelectTrigger
                                id={translationId}
                                aria-label="Change current verse translation"
                                className="current-translation"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {translations
                                    .filter((item) =>
                                        installed.includes(item.id)
                                    )
                                    .map((item) => (
                                        <SelectItem
                                            key={item.id}
                                            value={item.id}
                                        >
                                            {item.shortName}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="display-navigation">
                        <span>Audience navigation</span>
                        <div className="navigation-pair">
                            <Button
                                variant="outline"
                                disabled={
                                    !current ||
                                    !isInstalled(current) ||
                                    workspace.canPrevious === false
                                }
                                onClick={() => navigate(-1)}
                            >
                                <ChevronLeft />
                                Show previous
                            </Button>
                            <Button
                                variant="outline"
                                disabled={
                                    !current ||
                                    !isInstalled(current) ||
                                    workspace.canNext === false
                                }
                                onClick={() => navigate(1)}
                            >
                                Show next
                                <ChevronRight />
                            </Button>
                        </div>
                    </div>
                    <p className="display-action-note">
                        Changes audience output when open.
                    </p>
                </div>
            </div>
        </>
    );
}
