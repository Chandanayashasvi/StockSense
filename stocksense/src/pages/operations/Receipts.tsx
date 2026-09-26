import OperationsListPage from "./OperationsListPage";

export default function Receipts() {
  return (
    <OperationsListPage
      type="receipt"
      title="Receipts"
      description="Stock arriving from suppliers. Receive it to add it to inventory."
      newLabel="New receipt"
      emptyTitle="No receipts yet"
      emptyDescription="Create a receipt when stock is expected from a supplier."
    />
  );
}
