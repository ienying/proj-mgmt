"use client";

import { useState, useCallback } from "react";
import { CustomerList } from "./case-center/customer-list";
import { CustomerDetail } from "./case-center/customer-detail";
import { CustomerForm } from "./case-center/customer-form";
import { ProductCases } from "./case-center/product-cases";

type SubView =
  | "customer-list"
  | "customer-detail"
  | "customer-form"
  | "product-cases";

interface CaseCenterProps {
  currentUser: {
    id: string;
    name: string;
    department?: string;
    phone?: string;
    role?: string;
  };
}

export default function CaseCenter({ currentUser }: CaseCenterProps) {
  const [subView, setSubView] = useState<SubView>("customer-list");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);

  const handleViewCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setSubView("customer-detail");
  }, []);

  const handleCreateCustomer = useCallback(() => {
    setEditCustomerId(null);
    setSubView("customer-form");
  }, []);

  const handleEditCustomer = useCallback((id: string) => {
    setEditCustomerId(id);
    setSubView("customer-form");
  }, []);

  const handleFormSaved = useCallback((customerId: string) => {
    setSelectedCustomerId(customerId);
    setSubView("customer-detail");
  }, []);

  const handleFormCancel = useCallback(() => {
    if (selectedCustomerId) {
      setSubView("customer-detail");
    } else {
      setSubView("customer-list");
    }
  }, [selectedCustomerId]);

  const handleBackToList = useCallback(() => {
    setSelectedCustomerId(null);
    setSubView("customer-list");
  }, []);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        {subView === "customer-list" && (
          <CustomerList
            onViewCustomer={handleViewCustomer}
            onCreateCustomer={handleCreateCustomer}
          />
        )}
        {subView === "customer-detail" && selectedCustomerId && (
          <CustomerDetail
            customerId={selectedCustomerId}
            onBack={handleBackToList}
            onEdit={handleEditCustomer}
            currentUser={currentUser}
          />
        )}
        {subView === "customer-form" && (
          <CustomerForm
            customerId={editCustomerId}
            onSaved={handleFormSaved}
            onCancel={handleFormCancel}
            currentUser={currentUser}
          />
        )}
        {subView === "product-cases" && (
          <ProductCases />
        )}
      </div>
    </div>
  );
}
