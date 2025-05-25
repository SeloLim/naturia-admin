import { ConfirmationDialog } from "./dialog-confirmation";

export function DeleteSkinTypeDialog({
  open,
  onOpenChange,
  skinTypeTitle,
  onConfirmDelete,
  isDeleting
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skinTypeTitle?: string;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}) {
  const title = "Delete Skin Type";
  const message = (
    <>
      <span className="inline-block text-gray-500 mt-1">
        Are you sure you want to delete this skin type
      </span>
      {skinTypeTitle ? <strong> {skinTypeTitle}</strong> : ""}?
      <br />
      <span className="inline-block text-gray-500 mt-2">
        This action cannot be undone. The skin type will be permanently removed from your database.
      </span>
    </>
  );
  

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      confirmLabel="Delete Skin Type"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={onConfirmDelete}
      isLoading={isDeleting}
    />
  );
}