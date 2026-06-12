"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Building2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [activeTab, setActiveTab] = useState<"profile" | "cases">("profile");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);

  const handleTabChange = (tab: "profile" | "cases") => {
    setActiveTab(tab);
    if (tab === "profile") {
      setSubView("customer-list");
      setSelectedCustomerId(null);
      setEditCustomerId(null);
    } else {
      setSubView("product-cases");
    }
  };

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
      {/* 顶部 Tab 导航：用户画像 | 产品案例 */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b bg-card">
        <button
          onClick={() => handleTabChange("profile")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors",
            activeTab === "profile"
              ? "bg-background text-foreground border border-b-background -mb-[2px] relative z-10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="w-4 h-4" />
          用户画像
        </button>
        <button
          onClick={() => handleTabChange("cases")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors",
            activeTab === "cases"
              ? "bg-background text-foreground border border-b-background -mb-[2px] relative z-10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="w-4 h-4" />
          产品案例
        </button>
      </div>

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
