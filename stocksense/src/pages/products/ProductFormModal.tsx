import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useForm } from "@/hooks/useForm";
import { required, isSkuFormat, isNumeric, isNonNegative, maxLength } from "@/utils/validators";
import { createProduct } from "@/services/productService";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/services/apiClient";
import type { Category, Warehouse } from "@/types";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: Category[];
  warehouses: Warehouse[];
}

export default function ProductFormModal({ isOpen, onClose, onCreated, categories, warehouses }: ProductFormModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { values, errors, setField, blurField, validateAll, reset } = useForm(
    { name: "", sku: "", categoryId: "", unitOfMeasure: "", reorderPoint: "0", initialStock: "0", warehouseId: "" },
    {
      name: [required("Product name"), maxLength(80, "Product name")],
      sku: [required("SKU"), isSkuFormat],
      categoryId: [required("Category")],
      unitOfMeasure: [required("Unit of measure")],
      reorderPoint: [required("Reorder point"), isNumeric("Reorder point"), isNonNegative("Reorder point")],
      initialStock: [isNumeric("Initial stock"), isNonNegative("Initial stock")],
      warehouseId: [required("Warehouse")],
    }
  );

  useEffect(() => {
    if (isOpen) {
      reset();
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validateAll()) return;
    setSubmitting(true);
    try {
      await createProduct({
        name: values.name.trim(),
        sku: values.sku.trim().toUpperCase(),
        categoryId: values.categoryId,
        unitOfMeasure: values.unitOfMeasure,
        reorderPoint: Number(values.reorderPoint),
        initialStock: Number(values.initialStock || 0),
        warehouseId: values.warehouseId,
      });
      showToast(`"${values.name}" was added to your catalog.`, "success");
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save this product. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New product"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="product-form" isLoading={submitting}>
            Save product
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="text-sm text-signal-red bg-signal-red/5 border border-signal-red/20 rounded-md px-3 py-2">
            {formError}
          </div>
        )}
        <Input label="Product name" placeholder="e.g. Steel Rods (6mm)" value={values.name} error={errors.name} onChange={(e) => setField("name", e.target.value)} onBlur={() => blurField("name")} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="SKU / Code"
            placeholder="STL-ROD-06"
            value={values.sku}
            error={errors.sku}
            onChange={(e) => setField("sku", e.target.value)}
            onBlur={() => blurField("sku")}
          />
          <Select label="Category" value={values.categoryId} error={errors.categoryId} onChange={(e) => setField("categoryId", e.target.value)} onBlur={() => blurField("categoryId")}>
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Unit of measure" value={values.unitOfMeasure} error={errors.unitOfMeasure} onChange={(e) => setField("unitOfMeasure", e.target.value)} onBlur={() => blurField("unitOfMeasure")}>
            <option value="">Select…</option>
            <option value="pcs">pcs</option>
            <option value="kg">kg</option>
            <option value="sheet">sheet</option>
            <option value="box">box</option>
            <option value="m">m</option>
          </Select>
          <Input
            label="Reorder point"
            inputMode="numeric"
            value={values.reorderPoint}
            error={errors.reorderPoint}
            onChange={(e) => setField("reorderPoint", e.target.value)}
            onBlur={() => blurField("reorderPoint")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Initial stock (optional)"
            inputMode="numeric"
            value={values.initialStock}
            error={errors.initialStock}
            onChange={(e) => setField("initialStock", e.target.value)}
            onBlur={() => blurField("initialStock")}
          />
          <Select label="Warehouse" value={values.warehouseId} error={errors.warehouseId} onChange={(e) => setField("warehouseId", e.target.value)} onBlur={() => blurField("warehouseId")}>
            <option value="">Select…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Modal>
  );
}
