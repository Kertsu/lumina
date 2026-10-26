import { BookOpen } from "lucide-react";
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
import { Switch } from "@/shared/ui/switch";
import { useDeskContext } from "./desk-context";

export function InformationDialog() {
    const {
        workspace,
        informationOpen,
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
        <Dialog open={informationOpen} onOpenChange={setInformationOpen}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Behind the passage</DialogTitle>
                    <DialogDescription>
                        Book information is private until you turn on its
                        audience display.
                    </DialogDescription>
                </DialogHeader>
                {!current && (
                    <Select
                        value={informationBook}
                        onValueChange={setInformationBook}
                    >
                        <SelectTrigger aria-label="Choose a book for information">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {workspace.books.map((book) => (
                                <SelectItem key={book.id} value={book.name}>
                                    {book.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <div className="book-info-heading">
                    <BookOpen />
                    <h3>{metadataSource?.book ?? "Choose a book"}</h3>
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
                <p className="metadata-attribution">{metadata?.attribution}</p>
                {metadataSource &&
                    !isInstalled(metadataSource) &&
                    !workspace.information && (
                        <p className="subtle">
                            Reinstall the original translation edition to
                            display new book information.
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
                            patch({ information })
                        }
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setInformationOpen(false)}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
