"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Building2, Package } from "lucide-react";
import { CustomerList } from "./case-center/customer-list";
import { CustomerDetail } from "./case-center/customer-detail";
import { CustomerForm } from "./case-center/customer-form";
import { ProductCases } from "./case-center/product-cases";
import { cn } from "@/lib/utils";

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

  const isDetailView = subView === "customer-detail" || subView === "customer-form";

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
    <div className="h-full flex flex-col min-h-0">
      {/* 顶部导航：详情页显示返回按钮，否则显示 Tab 切换 */}
      {isDetailView ? (
        <div className="shrink-0 px-4 py-2 border-b border-slate-200 bg-white">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回用户画像列表
          </button>
        </div>
      ) : (
        <div className="shrink-0 px-4 py-2 border-b border-slate-200 bg-white">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => handleTabChange("customer")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === "customer"
                  ? "bg-white text-teal-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Building2 className="w-4 h-4" />
              用户画像
            </button>
            <button
              onClick={() => handleTabChange("product")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === "product"
                  ? "bg-white text-teal-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Package className="w-4 h-4" />
              产品案例
            </button>
          </div>
        </div>
      )}
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
