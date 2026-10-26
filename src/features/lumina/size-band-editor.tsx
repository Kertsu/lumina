import { RotateCcw } from "lucide-react";
import { useId } from "react";
import { Button } from "@/shared/ui/button";
import { Slider } from "@/shared/ui/slider";
import type { Appearance } from "./model";
import { defaultAppearance } from "./model";

type Bands = Appearance["bands"];
const minimumFontSize = 18;
const maximumFontSize = 90;
// The IPC profile uses u32 exclusive upper bounds (inclusive maximum + 1).
const maximumBandBoundary = 0xffff_fffe;

export function SizeBandEditor({
    bands,
    currentLength,
    onChange,
}: {
    bands: Bands;
    currentLength: number | null;
    onChange: (bands: Bands) => void;
}) {
    const labelId = useId();
    const currentIndex =
        currentLength === null
            ? -1
            : bands.findIndex(
                  (band) =>
                      currentLength >= band.min && currentLength <= band.max
              );
    const currentBand = bands[currentIndex];
    const resize = (index: number, value: number) => {
        if (!Number.isFinite(value)) {
            return;
        }
        const size = Math.min(
            maximumFontSize,
            Math.max(minimumFontSize, value)
        );
        onChange(
            bands.map((band, itemIndex) =>
                itemIndex === index
                    ? {
                          ...band,
                          size,
                      }
                    : band
            )
        );
    };

    return (
        <section className="size-band-editor" aria-labelledby={labelId}>
            <div className="field-row">
                <span id={labelId} className="field-label">
                    Size bands
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    className="size-band-reset"
                    onClick={() => onChange(defaultAppearance().bands)}
                >
                    <RotateCcw />
                    Reset to defaults
                </Button>
            </div>
            <div className="field-row size-band-summary">
                <span className="subtle">
                    {currentLength === null
                        ? "No verse selected"
                        : `Current verse length: ${currentLength} characters`}
                </span>
                <span className="subtle">Characters / px</span>
            </div>
            <fieldset
                className="size-bands"
                aria-label="Verse length and font size"
            >
                {bands.map((band, index) => (
                    <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: Band positions stay fixed while their boundaries are edited.
                        key={index}
                        className={index === currentIndex ? "active-band" : ""}
                    >
                        <span className="band-boundary">
                            {Math.max(1, band.min)}–
                            {index === bands.length - 1 ? (
                                "∞"
                            ) : (
                                <input
                                    type="number"
                                    aria-label={`Maximum characters for size band ${index + 1}`}
                                    min={Math.max(1, band.min)}
                                    max={Math.min(
                                        maximumBandBoundary,
                                        bands[index + 1].max - 1
                                    )}
                                    value={band.max}
                                    onChange={(event) => {
                                        if (!event.target.value) {
                                            return;
                                        }
                                        const value =
                                            event.target.valueAsNumber;
                                        if (!Number.isFinite(value)) {
                                            return;
                                        }
                                        const max = Math.min(
                                            maximumBandBoundary,
                                            bands[index + 1].max - 1,
                                            Math.max(
                                                1,
                                                band.min,
                                                Math.round(value)
                                            )
                                        );
                                        onChange(
                                            bands.map((item, itemIndex) =>
                                                itemIndex === index
                                                    ? {
                                                          ...item,
                                                          max,
                                                      }
                                                    : itemIndex === index + 1
                                                      ? {
                                                            ...item,
                                                            min: max + 1,
                                                        }
                                                      : item
                                            )
                                        );
                                    }}
                                />
                            )}
                        </span>
                        <input
                            aria-label={`Font size for ${Math.max(1, band.min)} to ${Number.isFinite(band.max) ? band.max : "unlimited"} characters`}
                            type="number"
                            min={minimumFontSize}
                            max={maximumFontSize}
                            value={band.size}
                            onChange={(event) => {
                                if (event.target.value) {
                                    resize(index, event.target.valueAsNumber);
                                }
                            }}
                        />
                        <span>px</span>
                    </div>
                ))}
            </fieldset>
            <Slider
                aria-label="Current size band"
                min={minimumFontSize}
                max={maximumFontSize}
                step={1}
                disabled={!currentBand}
                value={[currentBand?.size ?? minimumFontSize]}
                onValueChange={([size]) => resize(currentIndex, size)}
            />
        </section>
    );
}
