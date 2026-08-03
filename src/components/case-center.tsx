"use client";

import { useState, useCallback } from "react";
// icons not needed in newspaper layout
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
    <div className="flex flex-col">
      {/* Newspaper masthead — only for list view */}
      {!isDetailView && (
        <div className="bg-[#fdfcf8] border-b-[3px] border-double border-red-700">
          <div className="max-w-[820px] mx-auto px-6 pt-8 pb-5 text-center">
            <h1 className="text-4xl font-black text-red-700 tracking-[6px]" style={{fontFamily:"STSong, Songti SC, Noto Serif SC, serif"}}>
              案例中心
            </h1>
            <p className="text-[11px] text-amber-700/60 tracking-[3px] mt-1">
              CASE CENTER · CUSTOMER & PRODUCT ARCHIVE
            </p>
            <p className="text-xs text-gray-400 mt-2 max-w-lg mx-auto leading-relaxed">
              面向教育行业售前与实施团队，统一管理客户学校画像、软硬件环境、科室业务需求、模块落地状态等全维度信息。
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {[
                { key: "customer" as TopTab, label: "🏫 用户画像" },
                { key: "product" as TopTab, label: "📦 产品案例" },
              ].map(tile => (
                <button
                  key={tile.key}
                  onClick={() => handleTabChange(tile.key)}
                  className={`px-5 py-2 text-sm font-medium transition-all duration-200 border ${
                    activeTab === tile.key
                      ? "bg-red-700 text-white border-red-700"
                      : "bg-white text-gray-500 border-[#d1c7b7] hover:bg-amber-50"
                  }`}
                >
                  {tile.label}
                </button>
              ))}
            </div>
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
