import { BookOpen } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Select } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { useDeskContext } from "./desk-context";

export function InformationDialog() {
    const {
        workspace,
        informationOpen,
        inspectInformation,
        setInformationOpen,
        informationBook,
        setInformationBook,
        patch,
        isInstalled,
        current,
        metadataSource,
        metadata,
    } = useDeskContext();
    return (
        <Dialog
            open={informationOpen}
            onOpenChange={setInformationOpen}
            width={520}
            title={<>Behind the passage</>}
            description={
                <>
                    Book information is private until you turn on its audience
                    display.
                </>
            }
            footer={
                <Button
                    variant="outline"
                    onClick={() => setInformationOpen(false)}
                >
                    Done
                </Button>
            }
        >
            {!current && (
                <Select
                    value={informationBook}
                    onChange={(name) => {
                        setInformationBook(name);
                        inspectInformation(
                            workspace.books.find((book) => book.name === name)
                                ?.id
                        );
                    }}
                    label={"Choose a book for information"}
                    options={workspace.books.map((book) => ({
                        value: book.name,
                        label: book.name,
                    }))}
                />
            )}
            <div className="book-info-heading">
                <BookOpen />
                <h3>
                    {metadata?.name ?? metadataSource?.book ?? "Choose a book"}
                </h3>
            </div>
            <dl className="book-metadata">
                {(
                    [
                        ["Author", metadata?.author],
                        ["Written", metadata?.date],
                        ["Location", metadata?.location],
                    ] as const
                )
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
            </dl>
            {metadata?.translationTitle && <p>{metadata.translationTitle}</p>}
            {metadata?.attribution && (
                <p className="metadata-attribution">{metadata.attribution}</p>
            )}
            {metadata?.sourceUrl && (
                <p>
                    <a href={metadata.sourceUrl}>{metadata.sourceUrl}</a>
                </p>
            )}
            {metadata?.rightsNotice && <p>{metadata.rightsNotice}</p>}
            {metadataSource &&
                !isInstalled(metadataSource) &&
                !workspace.information && (
                    <p className="subtle">
                        The original translation edition is unavailable for new
                        book information.
                    </p>
                )}
            <div className="info-toggle-row">
                <div>
                    <strong>Show on audience</strong>
                    <p>Keep the current verse for your return.</p>
                </div>
                <Switch
                    aria-label="Show book information on audience"
                    checked={workspace.information}
                    disabled={
                        !metadata ||
                        Boolean(
                            metadataSource &&
                                !workspace.information &&
                                !isInstalled(metadataSource)
                        )
                    }
                    onCheckedChange={(information) =>
                        patch({
                            information,
                        })
                    }
                />
            </div>
        </Dialog>
    );
}
