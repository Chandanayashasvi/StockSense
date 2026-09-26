import OperationsListPage from "./OperationsListPage";

export default function Transfers() {
  return (
    <OperationsListPage
      type="transfer"
      title="Internal Transfers"
      description="Move stock between warehouses, racks, or floors without changing total quantity."
      newLabel="New transfer"
      emptyTitle="No internal transfers yet"
      emptyDescription="Create a transfer to move stock between two locations."
    />
  );
}
