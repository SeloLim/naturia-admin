import { ConfirmationDialog } from "./dialog-confirmation";

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  categoryTitle,
  onConfirmDelete,
  isDeleting
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryTitle?: string;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}) {
  const title = "Delete Category";
  const message = (
    <>
      <span className="inline-block text-gray-500 mt-1">
        Are you sure you want to delete this category
      </span>
      {categoryTitle ? <strong> {categoryTitle}</strong> : ""}?
      <br />
      <span className="inline-block text-gray-500 mt-2">
        This action cannot be undone. The category will be permanently removed from your database.
      </span>
    </>
  );
  

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      confirmLabel="Delete Category"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={onConfirmDelete}
      isLoading={isDeleting}
    />
  );
}