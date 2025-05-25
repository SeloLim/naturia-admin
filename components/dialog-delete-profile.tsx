import { ConfirmationDialog } from "./dialog-confirmation";

export function DeleteProfileDialog({
  open,
  onOpenChange,
  profileName,
  onConfirmDelete,
  isDeleting
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName?: string;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}) {
  const title = "Delete User";
  const message = (
    <>
      <span className="inline-block text-gray-500 mt-1">
        Are you sure you want to delete this user
      </span>
      {profileName ? <strong> {profileName}</strong> : ""}?
      <br />
      <span className="inline-block text-gray-500 mt-2">
        This action cannot be undone. The user will be permanently removed from your database.
      </span>
    </>
  );
  

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      confirmLabel="Delete User"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={onConfirmDelete}
      isLoading={isDeleting}
    />
  );
}