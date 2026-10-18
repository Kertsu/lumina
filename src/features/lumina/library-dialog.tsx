import {
    BookOpen,
    Check,
    Database,
    FileUp,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { TranslationId } from "./fixtures";
import { translations, verses } from "./fixtures";

type Props = {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    installed: TranslationId[];
    audiencesOpen: boolean;
    onRemove: (id: TranslationId) => void;
    onAdd: () => void;
};

export function LibraryDialog({
    open,
    onOpenChange,
    installed,
    audiencesOpen,
    onRemove,
    onAdd,
}: Props) {
    const [review, setReview] = useState(false);
    const [remove, setRemove] = useState<TranslationId | null>(null);
    const [error, setError] = useState("");
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                setReview(false);
                setRemove(null);
                setError("");
                onOpenChange(value);
            }}
        >
            <DialogContent className="sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle>Your Bible library</DialogTitle>
                    <DialogDescription>
                        Shared across every workspace. Keep the words close.
                    </DialogDescription>
                </DialogHeader>
                <div className="demo-notice">
                    <Database />
                    <p>
                        This prototype uses a small English and Tagalog fixture
                        library. Imports below demonstrate the review flow;
                        SQLite files are not processed.
                    </p>
                </div>
                <div className="library-list">
                    {translations
                        .filter((translation) =>
                            installed.includes(translation.id)
                        )
                        .map((translation) => (
                            <div key={translation.id} className="library-item">
                                <div className="library-icon">
                                    <BookOpen />
                                </div>
                                <div className="flex-1">
                                    <h3>{translation.name}</h3>
                                    <p>
                                        {translation.language} ·{" "}
                                        {
                                            verses.filter(
                                                (verse) =>
                                                    verse.translation ===
                                                    translation.id
                                            ).length
                                        }{" "}
                                        fixture verses
                                    </p>
                                    <span>
                                        {translation.id === "web"
                                            ? "Bundled · protected"
                                            : "Imported demo edition"}
                                    </span>
                                </div>
                                {translation.id === "web" ? (
                                    <ShieldCheck
                                        className="size-5 text-primary"
                                        aria-label="Bundled Bible protected"
                                    />
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Remove Ang Dating Biblia"
                                        disabled={audiencesOpen}
                                        onClick={() =>
                                            setRemove(translation.id)
                                        }
                                    >
                                        <Trash2 />
                                    </Button>
                                )}
                            </div>
                        ))}
                </div>
                {audiencesOpen && (
                    <p className="subtle">
                        Close every audience before removing a translation.
                    </p>
                )}
                {remove && (
                    <div className="confirmation-box">
                        <h3>Remove Ang Dating Biblia?</h3>
                        <p>
                            Captured verses and history keep their original
                            wording. New lookups will use WEB.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRemove(null)}
                            >
                                Keep translation
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    onRemove(remove);
                                    setRemove(null);
                                }}
                            >
                                Remove translation
                            </Button>
                        </div>
                    </div>
                )}
                {review ? (
                    <div className="import-review">
                        <div className="flex items-center gap-2">
                            <Check className="size-4 text-live" />
                            <h3>Ready to review</h3>
                        </div>
                        <p>Ang Dating Biblia · Tagalog · demo edition</p>
                        <p>
                            {installed.includes("adb")
                                ? "This exact fixture edition is already installed. It will be skipped."
                                : "Add the included Tagalog fixture to every workspace. Existing saved copies keep their captured text."}
                        </p>
                        <div className="flex gap-2 mt-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReview(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    onAdd();
                                    setReview(false);
                                }}
                            >
                                {installed.includes("adb")
                                    ? "Skip duplicate"
                                    : "Add translation"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="import-dropzone"
                        onClick={() => setReview(true)}
                    >
                        <FileUp />
                        <strong>Review a sample import</strong>
                        <span>See how adding a Bible will feel</span>
                    </button>
                )}
                <label className="file-demo-label">
                    Or choose a SQLite file to try the file picker
                    <input
                        type="file"
                        accept=".sqlite,.sqlite3,.db"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (!/\.(sqlite3?|db)$/i.test(file.name)) {
                                setError(
                                    "Choose a .sqlite, .sqlite3, or .db file."
                                );
                                return;
                            }
                            setError(
                                `“${file.name}” selected. File processing is unavailable in this UI prototype. Use the sample import above.`
                            );
                        }}
                    />
                </label>
                {error && (
                    <p className="inline-error" role="status">
                        {error}
                    </p>
                )}
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
