import { BookOpen, CornerDownLeft, Eye, Send } from "lucide-react";
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
export function QuickReferenceBar() {
    const {
        workspace,
        translations,
        installed,
        translationOpen,
        setTranslationOpen,
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
                        open={translationOpen}
                        onOpenChange={setTranslationOpen}
                        value={workspace.translation}
                        onValueChange={(id: TranslationId) =>
                            patch({
                                translation: id,
                                submittedQuery: "",
                                page: 1,
                            })
                        }
                    >
                        <SelectTrigger
                            className="translation-picker"
                            aria-label="Lookup translation"
                            title={`Lookup translation: ${translation?.name} · F1`}
                        >
                            <SelectValue>{translation?.shortName}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {translations
                                .filter((item) => installed.includes(item.id))
                                .map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
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
                    onClick={() => submitReference(true)}
                >
                    <Eye />
                    Check preview
                </Button>
                <Button type="submit" aria-keyshortcuts="Enter">
                    <Send />
                    Send Live
                    <kbd>
                        <CornerDownLeft />
                    </kbd>
                </Button>
            </form>
        </footer>
    );
}
