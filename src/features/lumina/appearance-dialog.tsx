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
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { TranslationId, Verse } from "./fixtures";
import { translations } from "./fixtures";
import type { Appearance } from "./model";
import { getBand } from "./model";
import { VerseSlide } from "./verse-slide";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appearance: Appearance;
    verse: Verse | null;
    translation: TranslationId;
    onApply: (appearance: Appearance) => void;
};

export function AppearanceDialog({
    open,
    onOpenChange,
    appearance,
    verse,
    translation,
    onApply,
}: Props) {
    const fontId = useId();
    const [draft, setDraft] = useState(appearance);
    const [error, setError] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    const selectedTranslation = verse?.translation ?? translation;
    const currentBand = verse ? getBand(verse, draft) : draft.bands[1];
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
                        <Palette className="inline size-5 mr-2 text-primary" />
                        Make room for the Word
                    </DialogTitle>
                    <DialogDescription>
                        Style this workspace. Preview your changes before
                        applying.
                    </DialogDescription>
                </DialogHeader>
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
                        <div className="field-row">
                            <span className="field-label">Size bands</span>
                            <span className="subtle">Characters / px</span>
                        </div>
                        <div className="size-bands">
                            {draft.bands.map((band, index) => (
                                <div
                                    key={band.min}
                                    className={
                                        currentBand?.min === band.min
                                            ? "active-band"
                                            : ""
                                    }
                                >
                                    <span className="band-boundary">
                                        {band.min}–
                                        {index === draft.bands.length - 1 ? (
                                            "∞"
                                        ) : (
                                            <input
                                                type="number"
                                                aria-label={`Maximum characters for size band ${index + 1}`}
                                                min={band.min}
                                                max={
                                                    draft.bands[index + 1].max -
                                                    1
                                                }
                                                value={band.max}
                                                onChange={(event) => {
                                                    const max = Math.min(
                                                        draft.bands[index + 1]
                                                            .max - 1,
                                                        Math.max(
                                                            band.min,
                                                            Math.round(
                                                                Number(
                                                                    event.target
                                                                        .value
                                                                )
                                                            )
                                                        )
                                                    );
                                                    patch({
                                                        bands: draft.bands.map(
                                                            (
                                                                item,
                                                                itemIndex
                                                            ) =>
                                                                itemIndex ===
                                                                index
                                                                    ? {
                                                                          ...item,
                                                                          max,
                                                                      }
                                                                    : itemIndex ===
                                                                        index +
                                                                            1
                                                                      ? {
                                                                            ...item,
                                                                            min:
                                                                                max +
                                                                                1,
                                                                        }
                                                                      : item
                                                        ),
                                                    });
                                                }}
                                            />
                                        )}
                                    </span>
                                    <input
                                        aria-label={`Font size for ${band.min} to ${band.max} characters`}
                                        type="number"
                                        min={18}
                                        max={90}
                                        value={band.size}
                                        onChange={(event) =>
                                            patch({
                                                bands: draft.bands.map(
                                                    (item, itemIndex) =>
                                                        itemIndex === index
                                                            ? {
                                                                  ...item,
                                                                  size: Math.min(
                                                                      90,
                                                                      Math.max(
                                                                          18,
                                                                          Number(
                                                                              event
                                                                                  .target
                                                                                  .value
                                                                          )
                                                                      )
                                                                  ),
                                                              }
                                                            : item
                                                ),
                                            })
                                        }
                                    />
                                    <span>px</span>
                                </div>
                            ))}
                        </div>
                        <Slider
                            aria-label="Current size band"
                            min={18}
                            max={90}
                            step={1}
                            value={[currentBand?.size ?? 48]}
                            onValueChange={([size]) =>
                                patch({
                                    bands: draft.bands.map((band) =>
                                        band.min === currentBand?.min
                                            ? {
                                                  ...band,
                                                  size,
                                              }
                                            : band
                                    ),
                                })
                            }
                        />
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
                        <div className="flex gap-2 mt-3">
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
                                <SelectTrigger
                                    className="flex-1"
                                    aria-label="Background fit"
                                >
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
                                if (!file) return;
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
