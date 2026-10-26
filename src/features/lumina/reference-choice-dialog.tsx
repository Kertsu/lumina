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
import { useDeskContext } from "./desk-context";

export function ReferenceChoiceDialog() {
    const { controller, dispatch } = useDeskContext();
    const choice = controller.referenceChoice;
    return (
        <Dialog
            open={Boolean(choice)}
            onOpenChange={(open) => {
                if (!open) {
                    dispatch({
                        type: "cancelReferenceChoice",
                    });
                }
            }}
        >
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Choose the book</DialogTitle>
                    <DialogDescription>
                        “{choice?.input}” matches more than one book. Choose the
                        intended reference.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    {choice?.candidates.map((book) => (
                        <Button
                            key={book.bookNumber}
                            variant="outline"
                            className="justify-start"
                            onClick={() =>
                                dispatch({
                                    type: "chooseReference",
                                    workspaceId: choice.workspaceId,
                                    choiceToken: choice.choiceToken,
                                    bookNumber: book.bookNumber,
                                })
                            }
                        >
                            <BookOpen />
                            {book.name}
                        </Button>
                    ))}
                </div>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() =>
                            dispatch({
                                type: "cancelReferenceChoice",
                            })
                        }
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
