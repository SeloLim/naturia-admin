import { ConfirmationDialog } from "./dialog-confirmation";

export function DeleteBannerDialog({
  open,
  onOpenChange,
  bannerTitle,
  onConfirmDelete,
  isDeleting
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bannerTitle?: string;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}) {
  const title = "Delete Banner";
  const message = (
    <>
      <span className="inline-block text-gray-500 mt-1">
        Are you sure you want to delete this banner
      </span>
      {bannerTitle ? <strong> {bannerTitle}</strong> : ""}?
      <br />
      <span className="inline-block text-gray-500 mt-2">
        This action cannot be undone. The banner will be permanently removed from your carousel.
      </span>
    </>
  );
  

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      confirmLabel="Delete Banner"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={onConfirmDelete}
      isLoading={isDeleting}
    />
  );
}