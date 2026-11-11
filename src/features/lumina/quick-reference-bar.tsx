import { BookOpen, CornerDownLeft, Eye, Send } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Select, SelectValue } from "@/shared/ui/select";
import { useDeskContext } from "./desk-context";
import type { TranslationId } from "./fixtures";
export function QuickReferenceBar() {
    const {
        workspace,
        translations,
        installed,
        translationTrigger,
        reference,
        setReference,
        referenceError,
        setReferenceError,
        referenceInput,
        referenceErrorId,
        patch,
        submitReference,
        translation,
    } = useDeskContext();
    return (
        <footer className="quick-reference-bar">
            <div className="quick-reference-label">
                <BookOpen />
                <span>Quick reference</span>
                <kbd>⌘ K</kbd>
            </div>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    submitReference(false);
                }}
            >
                <div
                    className={`reference-input-wrap ${referenceError ? "has-error" : ""}`}
                >
                    <input
                        ref={referenceInput}
                        aria-label="Quick reference"
                        aria-invalid={Boolean(referenceError)}
                        aria-describedby={
                            referenceError ? referenceErrorId : undefined
                        }
                        placeholder="John 3:16 or Juan 3:16"
                        value={reference}
                        onChange={(event) => {
                            setReference(event.target.value);
                            setReferenceError("");
                        }}
                    />
                    <Select
                        value={workspace.translation}
                        onChange={(id: TranslationId) =>
                            patch({
                                translation: id,
                            })
                        }
                        controlClassName="translation-picker"
                        containerClassName="translation-picker-field"
                        variant="ghost"
                        placement="above"
                        size="sm"
                        ref={translationTrigger}
                        label={"Lookup translation"}
                        options={translations
                            .filter((item) => installed.includes(item.id))
                            .map((item) => ({
                                value: item.id,
                                label: item.name,
                            }))}
                        renderValue={(option) => (
                            <SelectValue
                                label={option.label ?? option.value}
                                text={
                                    translation?.shortName ??
                                    option.label ??
                                    option.value
                                }
                            />
                        )}
                    />
                    {referenceError && (
                        <p
                            id={referenceErrorId}
                            className="reference-error"
                            role="alert"
                        >
                            {referenceError}
                        </p>
                    )}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    icon={<Eye aria-hidden="true" />}
                    onClick={() => submitReference(true)}
                >
                    Check preview
                </Button>
                <Button
                    type="submit"
                    aria-keyshortcuts="Enter"
                    icon={<Send aria-hidden="true" />}
                    endContent={
                        <kbd aria-label="Enter">
                            <CornerDownLeft aria-hidden="true" />
                        </kbd>
                    }
                >
                    Send Live
                </Button>
            </form>
        </footer>
    );
}
