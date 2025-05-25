import { ConfirmationDialog } from "./dialog-confirmation";

export function DeletePaymentMethodDialog({
  open,
  onOpenChange,
  paymentMethodName,
  onConfirmDelete,
  isDeleting
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethodName?: string;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}) {
  const title = "Delete Payment Method";
  const message = (
    <>
      <span className="inline-block text-gray-500 mt-1">
        Are you sure you want to delete this payment method
      </span>
      {paymentMethodName ? <strong> {paymentMethodName}</strong> : ""}?
      <br />
      <span className="inline-block text-gray-500 mt-2">
        This action cannot be undone. The payment method will be permanently removed from your database.
      </span>
    </>
  );
  

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      confirmLabel="Delete Payment Method"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={onConfirmDelete}
      isLoading={isDeleting}
    />
  );
}