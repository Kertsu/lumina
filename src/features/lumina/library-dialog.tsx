import { IconButton } from "@astryxdesign/core/IconButton";
import {
    BookOpen,
    Check,
    Database,
    FileUp,
    LoaderCircle,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import type { Translation } from "./fixtures";
import type { ImportReview } from "./model";

type Props = {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    translations: Translation[];
    audiencesOpen: boolean;
    review?: ImportReview | null;
    publishingImport?: boolean;
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
    publishingImport = false,
    onRemove,
    onReview,
    onPublish,
    onCancel,
}: Props) {
    const [remove, setRemove] = useState<string | null>(null);
    const publishLabel = publishingImport
        ? "Adding translations…"
        : "Add translations";
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                setRemove(null);
                onOpenChange(value);
            }}
            width={620}
            title={<>Your Bible library</>}
            description={
                <>Shared across every workspace. Keep the words close.</>
            }
            footer={
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Done
                </Button>
            }
        >
            <div className="demo-notice">
                <Database />
                <p>
                    Installed translations stay available offline. Review a
                    SQLite Bible before adding it to your library.
                </p>
            </div>
            <div className="library-list">
                {translations.map((translation) => (
                    <div key={translation.id}>
                        <div className="library-item">
                            <div className="library-icon">
                                <BookOpen />
                            </div>
                            <div className="flex-1">
                                <h3>{translation.name}</h3>
                                <p>
                                    {translation.bookCount ?? 0} books ·{" "}
                                    {translation.verseCount ?? 0} verses
                                </p>
                                <span className="library-edition">
                                    {translation.bundled
                                        ? "Bundled · protected"
                                        : (translation.importLabel ??
                                          "Imported edition")}
                                </span>
                            </div>
                            {translation.bundled ? (
                                <ShieldCheck
                                    className="size-5 text-muted-foreground"
                                    aria-label="Bundled Bible protected"
                                />
                            ) : (
                                <IconButton
                                    variant="ghost"
                                    label={`Remove ${translation.name}`}
                                    icon={<Trash2 aria-hidden="true" />}
                                    isDisabled={audiencesOpen}
                                    aria-expanded={
                                        remove === translation.id &&
                                        !audiencesOpen
                                    }
                                    onClick={() => setRemove(translation.id)}
                                />
                            )}
                        </div>
                        {remove === translation.id &&
                            !translation.bundled &&
                            !audiencesOpen && (
                                <div className="confirmation-box">
                                    <h3>Remove {translation.name}?</h3>
                                    <p>
                                        Captured verses and history keep their
                                        original wording. New lookups will use
                                        WEB.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
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
                                                onRemove(translation.id);
                                                setRemove(null);
                                            }}
                                        >
                                            Remove translation
                                        </Button>
                                    </div>
                                </div>
                            )}
                    </div>
                ))}
            </div>
            {audiencesOpen && (
                <p className="subtle">
                    Close every audience before removing a translation.
                </p>
            )}
            {review ? (
                <div className="import-review">
                    <div className="flex items-center gap-2">
                        <Check className="size-4 text-success" />
                        <h3>Ready to review</h3>
                    </div>
                    <p>{review.label}</p>
                    {review.translations.map((translation, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: Reviewed source rows have stable positions and may share titles.
                        <p key={`${translation.title}-${index}`}>
                            {translation.title} · {translation.bookCount} books
                            · {translation.verseCount} verses
                        </p>
                    ))}
                    {review.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                    ))}
                    <span className="sr-only" role="status">
                        {publishingImport ? publishLabel : null}
                    </span>
                    <div className="flex gap-2 mt-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={publishingImport}
                            onClick={() => onCancel(review.id)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                            disabled={publishingImport}
                            onClick={() => onPublish(review.id)}
                        >
                            {publishingImport && (
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="motion-safe:animate-spin"
                                />
                            )}
                            {publishLabel}
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
        </Dialog>
    );
}
