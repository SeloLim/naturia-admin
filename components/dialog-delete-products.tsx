import { ConfirmationDialog } from "./dialog-confirmation";

export function DeleteProductDialog({
  open,
  onOpenChange,
  productTitle,
  onConfirmDelete,
  isDeleting
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle?: string;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}) {
  const title = "Delete Product";
  const message = (
    <>
      <span className="inline-block text-gray-500 mt-1">
        Are you sure you want to delete this product
      </span>
      {productTitle ? <strong> {productTitle}</strong> : ""}?
      <br />
      <span className="inline-block text-gray-500 mt-2">
        This action cannot be undone. The product will be permanently removed from your carousel.
      </span>
    </>
  );
  

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      confirmLabel="Delete Product"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={onConfirmDelete}
      isLoading={isDeleting}
    />
  );
}