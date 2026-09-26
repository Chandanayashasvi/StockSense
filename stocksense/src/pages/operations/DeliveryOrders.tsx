import OperationsListPage from "./OperationsListPage";

export default function DeliveryOrders() {
  return (
    <OperationsListPage
      type="delivery"
      title="Delivery Orders"
      description="Stock leaving the warehouse for customers. Deliver it to remove it from inventory."
      newLabel="New delivery"
      emptyTitle="No delivery orders yet"
      emptyDescription="Create a delivery order when a customer shipment is ready to go out."
    />
  );
}
