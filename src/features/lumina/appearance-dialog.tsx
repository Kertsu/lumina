import {
    Bold,
    Check,
    ImagePlus,
    Italic,
    Palette,
    Strikethrough,
    Underline,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Select } from "@/shared/ui/select";
import type { Translation, TranslationId, Verse } from "./fixtures";
import type { Appearance } from "./model";
import { graphemeCount } from "./model";
import { SizeBandEditor } from "./size-band-editor";
import { VerseSlide } from "./verse-slide";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appearance: Appearance;
    verse: Verse | null;
    translation: TranslationId;
    onApply: (appearance: Appearance) => void;
    translations: Translation[];
};

export function AppearanceDialog({
    open,
    onOpenChange,
    appearance,
    verse,
    translation,
    onApply,
    translations,
}: Props) {
    const fontId = useId();
    const [draft, setDraft] = useState(appearance);
    const [error, setError] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    const selectedTranslation = verse?.translation ?? translation;
    const patch = (value: Partial<Appearance>) =>
        setDraft((previous) => ({
            ...previous,
            ...value,
        }));
    const setBackground = (background: string) =>
        patch({
            backgrounds: {
                ...draft.backgrounds,
                [selectedTranslation]: background,
            },
        });

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (value) {
                    setDraft(appearance);
                    setError("");
                }
                onOpenChange(value);
            }}
            className="appearance-dialog"
            width={920}
            onOpened={() => {
                setDraft(appearance);
                setError("");
            }}
            title={
                <>
                    <Palette className="inline size-5 mr-2 text-muted-foreground" />
                    Make room for the Word
                </>
            }
            description={
                <>Style this workspace. Preview your changes before applying.</>
            }
            footer={
                <>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            onApply(draft);
                            onOpenChange(false);
                        }}
                    >
                        Apply appearance
                    </Button>
                </>
            }
        >
            <div className="appearance-dialog-body">
                <div className="appearance-grid">
                    <div className="appearance-controls">
                        <Select
                            value={draft.fontFamily}
                            onChange={(fontFamily) =>
                                patch({
                                    fontFamily,
                                })
                            }
                            id={fontId}
                            label={"Verse typeface"}
                            options={[
                                "Cormorant Garamond",
                                "DM Sans",
                                "Georgia",
                                "Arial",
                            ].map((font) => ({
                                value: font,
                                label: font,
                            }))}
                        />
                        <div className="font-style-controls">
                            {(
                                [
                                    ["bold", Bold, "Bold"],
                                    ["italic", Italic, "Italic"],
                                    ["underline", Underline, "Underline"],
                                    ["strike", Strikethrough, "Strikeout"],
                                ] as const
                            ).map(([key, Icon, label]) => (
                                <Button
                                    key={key}
                                    variant={
                                        draft[key] ? "secondary" : "outline"
                                    }
                                    size="icon"
                                    aria-label={label}
                                    aria-pressed={draft[key]}
                                    onClick={() =>
                                        patch({
                                            [key]: !draft[key],
                                        })
                                    }
                                >
                                    <Icon />
                                </Button>
                            ))}
                            <label
                                className="color-picker"
                                title="Verse text color"
                            >
                                <input
                                    type="color"
                                    aria-label="Verse text color"
                                    value={draft.color}
                                    onChange={(event) =>
                                        patch({
                                            color: event.target.value,
                                        })
                                    }
                                />
                            </label>
                        </div>
                        <div className="field-row mt-6">
                            <span className="field-label">Background</span>
                            <span className="subtle">
                                {
                                    translations.find(
                                        (item) =>
                                            item.id === selectedTranslation
                                    )?.shortName
                                }
                            </span>
                        </div>
                        <div className="background-options">
                            {["mountains", "forest", "midnight", "linen"].map(
                                (background) => (
                                    <button
                                        type="button"
                                        aria-label={`${background} background`}
                                        aria-pressed={
                                            draft.backgrounds[
                                                selectedTranslation
                                            ] === background
                                        }
                                        key={background}
                                        className={`background-option ${background}`}
                                        onClick={() =>
                                            setBackground(background)
                                        }
                                        style={{
                                            backgroundImage: [
                                                "mountains",
                                                "forest",
                                            ].includes(background)
                                                ? `url(/backgrounds/${background}.jpg)`
                                                : undefined,
                                        }}
                                    >
                                        {draft.backgrounds[
                                            selectedTranslation
                                        ] === background && <Check />}
                                    </button>
                                )
                            )}
                        </div>
                        <div className="background-actions">
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<ImagePlus aria-hidden="true" />}
                                onClick={() => fileInput.current?.click()}
                            >
                                Upload image
                            </Button>
                            <Select
                                size="sm"
                                value={draft.fit}
                                onChange={(fit) =>
                                    patch({
                                        fit:
                                            fit === "contain"
                                                ? "contain"
                                                : "cover",
                                    })
                                }
                                label={"Background fit"}
                                options={[
                                    {
                                        value: "cover",
                                        label: "Fill & crop",
                                    },
                                    {
                                        value: "contain",
                                        label: "Fit image",
                                    },
                                ]}
                            />
                        </div>
                        <input
                            ref={fileInput}
                            className="sr-only"
                            type="file"
                            accept="image/jpeg,image/png,image/bmp,.bmp"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) {
                                    return;
                                }
                                if (
                                    !/\.(jpe?g|png|bmp)$/i.test(file.name) ||
                                    file.size > 4 * 1024 * 1024
                                ) {
                                    setError(
                                        "Choose a JPEG, PNG, or BMP under 4 MB."
                                    );
                                    return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const result = String(reader.result);
                                    const image = new Image();
                                    image.onload = () => {
                                        setBackground(result);
                                        setError("");
                                    };
                                    image.onerror = () =>
                                        setError(
                                            "This image could not be read. Try a different file."
                                        );
                                    image.src = result;
                                };
                                reader.onerror = () =>
                                    setError(
                                        "This image could not be read. Try again."
                                    );
                                reader.readAsDataURL(file);
                            }}
                        />
                        {error && (
                            <p className="inline-error" role="alert">
                                {error}
                            </p>
                        )}
                        <SizeBandEditor
                            bands={draft.bands}
                            currentLength={
                                verse ? graphemeCount(verse.text) : null
                            }
                            onChange={(bands) =>
                                patch({
                                    bands,
                                })
                            }
                        />
                    </div>
                    <div className="appearance-sample">
                        <VerseSlide verse={verse} appearance={draft} />
                        <p>Appearance sample</p>
                        <span>
                            Reference and translation labels keep their own
                            styling.
                        </span>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
