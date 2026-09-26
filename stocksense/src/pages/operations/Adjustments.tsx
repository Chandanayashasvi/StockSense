import OperationsListPage from "./OperationsListPage";

export default function Adjustments() {
  return (
    <OperationsListPage
      type="adjustment"
      title="Stock Adjustments"
      description="Fix mismatches between recorded stock and a physical count."
      newLabel="New adjustment"
      emptyTitle="No adjustments yet"
      emptyDescription="Create an adjustment after a cycle count finds a mismatch, or to log damaged stock."
    />
  );
}
