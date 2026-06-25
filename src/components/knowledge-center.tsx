"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import HomeView from "./info-square/home-view";
import ListView from "./info-square/list-view";
import PostDrawer from "./info-square/post-drawer";
import PostEditor from "./info-square/post-editor";

const VideoCenterContent = dynamic(() => import("@/components/video-center"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mr-2" />
      加载中...
    </div>
  ),
});

interface KnowledgeCenterProps {
  currentUser?: { id?: string; name?: string; role?: string } | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  content_type: string;
  version: number;
  category_id?: string;
  author_id?: string;
  created_by?: string;
  created_by_name?: string;
  author_name?: string;
  is_pinned: boolean;
  tags?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  share_token?: string;
}

export default function KnowledgeCenter({ currentUser }: KnowledgeCenterProps) {
  const [view, setView] = useState<"home" | "list" | "drafts" | "video_center">("home");
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [isDraftView, setIsDraftView] = useState(false);
  const [drawerPost, setDrawerPost] = useState<Post | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEnterCategory = (categoryId: string, categoryName: string, categoryType: string) => {
    setSelectedCategory({ id: categoryId, name: categoryName, type: categoryType });
    setView("list");
  };

  const handleBack = () => {
    setView("home");
    setSelectedCategory(null);
    setIsDraftView(false);
  };

  const handleEnterDrafts = () => {
    setIsDraftView(true);
    setView("drafts");
  };

  const handleEnterVideoCenter = () => {
    setView("video_center");
  };

  const handlePostClick = (post: Post) => {
    setDrawerPost(post);
    setDrawerOpen(true);
  };

  const handlePublish = () => {
    setEditPost(null);
    setEditorOpen(true);
  };

  const handleEdit = (post: Post) => {
    setEditPost(post);
    setEditorOpen(true);
  };

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  const handlePostUpdated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="p-6" key={refreshKey}>
      {view === "video_center" ? (
        <VideoCenterContent currentUser={currentUser} onBack={handleBack} />
      ) : (
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">信息广场</h2>
          {view === "home" ? (
            <HomeView
              currentUser={currentUser}
              onEnterCategory={handleEnterCategory}
              onPostClick={handlePostClick}
              onEnterDrafts={handleEnterDrafts}
              onEnterVideoCenter={handleEnterVideoCenter}
            />
          ) : view === "drafts" ? (
            <ListView
              currentUser={currentUser}
              categoryId=""
              categoryName="我的草稿"
              categoryType="tech_doc"
              isDraft={true}
              onBack={handleBack}
              onPostClick={handlePostClick}
              onPublish={handlePublish}
              onEdit={handleEdit}
            />
          ) : selectedCategory ? (
            <ListView
              currentUser={currentUser}
              categoryId={selectedCategory.id}
              categoryName={selectedCategory.name}
              categoryType={selectedCategory.type}
              onBack={handleBack}
              onPostClick={handlePostClick}
              onPublish={handlePublish}
              onEdit={handleEdit}
            />
          ) : null}
        </div>
      )}

      <PostDrawer
        post={drawerPost}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        currentUser={currentUser}
        onPostUpdated={handlePostUpdated}
        onEdit={handleEdit}
      />

      <PostEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        currentUser={currentUser}
        editPost={editPost}
        categoryId={selectedCategory?.id}
        categoryType={selectedCategory?.type}
        onSaved={handleSaved}
      />
    </div>
  );
}
