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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
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
        >
            <DialogContent
                className="appearance-dialog sm:max-w-[920px]"
                onOpenAutoFocus={() => {
                    setDraft(appearance);
                    setError("");
                }}
            >
                <DialogHeader>
                    <DialogTitle>
                        <Palette className="inline size-5 mr-2 text-muted-foreground" />
                        Make room for the Word
                    </DialogTitle>
                    <DialogDescription>
                        Style this workspace. Preview your changes before
                        applying.
                    </DialogDescription>
                </DialogHeader>
                <div className="appearance-dialog-body">
                    <div className="appearance-grid">
                        <div className="appearance-controls">
                            <label className="field-label" htmlFor={fontId}>
                                Verse typeface
                            </label>
                            <Select
                                value={draft.fontFamily}
                                onValueChange={(fontFamily) =>
                                    patch({
                                        fontFamily,
                                    })
                                }
                            >
                                <SelectTrigger id={fontId}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        "Cormorant Garamond",
                                        "DM Sans",
                                        "Georgia",
                                        "Arial",
                                    ].map((font) => (
                                        <SelectItem key={font} value={font}>
                                            {font}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                {[
                                    "mountains",
                                    "forest",
                                    "midnight",
                                    "linen",
                                ].map((background) => (
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
                                ))}
                            </div>
                            <div className="background-actions">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInput.current?.click()}
                                >
                                    <ImagePlus />
                                    Upload image
                                </Button>
                                <Select
                                    value={draft.fit}
                                    onValueChange={(fit: "cover" | "contain") =>
                                        patch({
                                            fit,
                                        })
                                    }
                                >
                                    <SelectTrigger aria-label="Background fit">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cover">
                                            Fill & crop
                                        </SelectItem>
                                        <SelectItem value="contain">
                                            Fit image
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
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
                                        !/\.(jpe?g|png|bmp)$/i.test(
                                            file.name
                                        ) ||
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
                <DialogFooter>
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
