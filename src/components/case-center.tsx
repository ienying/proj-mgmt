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

type TopTab = "customer" | "product";

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
  const [activeTab, setActiveTab] = useState<TopTab>("customer");
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

  const handleTabChange = useCallback((tab: TopTab) => {
    setActiveTab(tab);
    setSelectedCustomerId(null);
    setEditCustomerId(null);
    setSubView(tab === "customer" ? "customer-list" : "product-cases");
  }, []);

  return (
    <div className="bg-[#f5f5f7] min-h-screen">
      {/* Content area — different layout for list vs detail */}
      {subView === "customer-list" && (
        <div className="max-w-[1380px] mx-auto px-10 pb-16">
          <CustomerList
            onViewCustomer={handleViewCustomer}
            onCreateCustomer={handleCreateCustomer}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
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
        <ProductCases onBack={handleBackToList} />
      )}
    </div>
  );
}
