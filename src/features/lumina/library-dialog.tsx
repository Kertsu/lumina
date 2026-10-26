import {
    BookOpen,
    Check,
    Database,
    FileUp,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import type { Translation } from "./fixtures";
import type { ImportReview } from "./model";

type Props = {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    translations: Translation[];
    audiencesOpen: boolean;
    review?: ImportReview | null;
    onRemove: (id: string) => void;
    onReview: () => void;
    onPublish: (id: string) => void;
    onCancel: (id: string) => void;
};

export function LibraryDialog({
    open,
    onOpenChange,
    translations,
    audiencesOpen,
    review,
    onRemove,
    onReview,
    onPublish,
    onCancel,
}: Props) {
    const [remove, setRemove] = useState<string | null>(null);
    const removing = translations.find(
        (translation) => translation.id === remove
    );
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                setRemove(null);
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
                        Installed translations stay available offline. Review a
                        SQLite Bible before adding it to your library.
                    </p>
                </div>
                <div className="library-list">
                    {translations.map((translation) => (
                        <div key={translation.id} className="library-item">
                            <div className="library-icon">
                                <BookOpen />
                            </div>
                            <div className="flex-1">
                                <h3>{translation.name}</h3>
                                <p>
                                    {translation.bookCount ?? 0} books ·{" "}
                                    {translation.verseCount ?? 0} verses
                                </p>
                                <span>
                                    {translation.bundled
                                        ? "Bundled · protected"
                                        : (translation.importLabel ??
                                          "Imported edition")}
                                </span>
                            </div>
                            {translation.bundled ? (
                                <ShieldCheck
                                    className="size-5 text-primary"
                                    aria-label="Bundled Bible protected"
                                />
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove ${translation.name}`}
                                    disabled={audiencesOpen}
                                    onClick={() => setRemove(translation.id)}
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
                {removing && (
                    <div className="confirmation-box">
                        <h3>Remove {removing.name}?</h3>
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
                                    onRemove(removing.id);
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
                        <p>{review.label}</p>
                        {review.translations.map((translation, index) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: Reviewed source rows have stable positions and may share titles.
                            <p key={`${translation.title}-${index}`}>
                                {translation.title} · {translation.bookCount}{" "}
                                books · {translation.verseCount} verses
                            </p>
                        ))}
                        {review.warnings.map((warning) => (
                            <p key={warning}>{warning}</p>
                        ))}
                        <div className="flex gap-2 mt-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCancel(review.id)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => onPublish(review.id)}
                            >
                                Add translations
                            </Button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="import-dropzone"
                        onClick={onReview}
                    >
                        <FileUp />
                        <strong>Review a Bible import</strong>
                        <span>Choose a SQLite file</span>
                    </button>
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
