"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Building2, Package } from "lucide-react";
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
    <div className="h-full flex flex-col min-h-0">
      {/* 页面标题 + Metro 磁贴 */}
      <div className="shrink-0 bg-white">
        <div className="px-6 pt-4 pb-1">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            案例中心
          </h2>
          <p className="text-sm text-muted-foreground mt-1">客户案例与产品案例管理</p>
        </div>

        {/* 详情页返回按钮 或 Metro 磁贴 */}
        {isDetailView ? (
          <div className="px-6 pb-2">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回用户画像列表
            </button>
          </div>
        ) : (
          <div className="px-3 pb-2 grid grid-cols-2 gap-1.5">
            {[
              { key: "customer" as TopTab, label: "用户画像", icon: <Building2 className="w-4 h-4" />, color: "#2672ec" },
              { key: "product" as TopTab, label: "产品案例", icon: <Package className="w-4 h-4" />, color: "#00aba9" },
            ].map(tile => (
              <button
                key={tile.key}
                onClick={() => handleTabChange(tile.key)}
                className={`
                  relative flex items-center justify-center gap-1.5 rounded-lg text-white text-center py-1.5
                  transition-all duration-150 select-none cursor-pointer overflow-hidden
                  ${activeTab === tile.key ? "ring-2 ring-white/60 ring-offset-1 ring-offset-gray-200 scale-[0.95]" : "hover:scale-[1.03]"}
                `}
                style={{ backgroundColor: tile.color }}
              >
                <span className="opacity-90 shrink-0">{tile.icon}</span>
                <div className="flex flex-col items-start leading-tight min-w-0">
                  <span className="font-medium text-[10px] truncate">{tile.label}</span>
                  <span className="font-bold text-sm leading-none invisible">—</span>
                </div>
              </button>
            ))}
          </div>
        )}
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
