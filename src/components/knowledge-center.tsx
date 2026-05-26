'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, BookOpen, Lightbulb, Plus, Search, Pin, Eye, ThumbsUp,
  MessageCircle, Star, FileText, Video, Folder, Download, Play,
  ArrowLeft, Send, X, Upload, ChevronRight, Clock, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

interface KnowledgeCenterProps {
  currentUser?: { id?: string; name?: string } | null;
}

interface Category {
  id: string;
  name: string;
  category_type: string;
  icon?: string;
  sort_order: number;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  media_type: string;
  duration?: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  post_type: string;
  category_id?: string;
  share_type?: string;
  author_id?: string;
  author_name?: string;
  is_pinned: boolean;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
  _liked?: boolean;
  _favorited?: boolean;
  _readCount?: number;
  _totalUsers?: number;
}

interface Comment {
  id: string;
  post_id: string;
  parent_id?: string;
  author_id: string;
  author_name?: string;
  content: string;
  created_at: string;
}

const POST_TYPE_MAP: Record<string, string> = {
  announcement: '公告通知',
  material: '共享资料',
  share: '经验分享'
};

const SHARE_TYPE_MAP: Record<string, string> = {
  experience: '实施经验',
  solution: '问题解决',
  best_practice: '最佳实践',
  tool: '工具推荐'
};

const MEDIA_TYPE_ICON: Record<string, React.ReactNode> = {
  document: <FileText className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  other: <Folder className="w-4 h-4" />,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

// ==================== Main Component ====================
export default function KnowledgeCenter({ currentUser }: KnowledgeCenterProps) {
  const [currentView, setCurrentView] = useState<'home' | 'list'>('home');
  const [activeTab, setActiveTab] = useState<string>('announcement');
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mediaFilter, setMediaFilter] = useState<string>('all');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [detailComments, setDetailComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [publishForm, setPublishForm] = useState({
    title: '',
    content: '',
    post_type: 'announcement' as string,
    category_id: '',
    share_type: '',
    is_pinned: false,
    tags: '' as string,
  });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [stats, setStats] = useState({ announcement: 0, material: 0, share: 0 });

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge/categories');
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch (e) { console.error('Failed to load categories:', e); }
  }, []);

  // Load posts
  const loadPosts = useCallback(async (postType?: string) => {
    setLoading(true);
    try {
      const type = postType || activeTab;
      let url = `/api/knowledge/posts?post_type=${type}`;
      if (selectedCategory !== 'all') url += `&category_id=${selectedCategory}`;
      if (searchKeyword) url += `&keyword=${encodeURIComponent(searchKeyword)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        let filtered = json.data as Post[];
        if (mediaFilter !== 'all') {
          filtered = filtered.filter(p => {
            const atts = p.attachments || [];
            if (atts.length === 0) return mediaFilter === 'other';
            return atts.some(a => a.media_type === mediaFilter);
          });
        }
        setPosts(filtered);
      }
    } catch (e) { console.error('Failed to load posts:', e); }
    setLoading(false);
  }, [activeTab, selectedCategory, searchKeyword, mediaFilter]);

  // Load stats for home cards
  const loadStats = useCallback(async () => {
    try {
      const [annRes, matRes, shareRes] = await Promise.all([
        fetch('/api/knowledge/posts?post_type=announcement'),
        fetch('/api/knowledge/posts?post_type=material'),
        fetch('/api/knowledge/posts?post_type=share'),
      ]);
      const [annJson, matJson, shareJson] = await Promise.all([annRes.json(), matRes.json(), shareRes.json()]);
      setStats({
        announcement: annJson.data?.length || 0,
        material: matJson.data?.length || 0,
        share: shareJson.data?.length || 0,
      });
    } catch (e) { console.error('Failed to load stats:', e); }
  }, []);

  useEffect(() => { loadCategories(); loadStats(); }, [loadCategories, loadStats]);

  useEffect(() => {
    if (currentView === 'list') loadPosts();
  }, [currentView, loadPosts]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedCategory('all');
    setMediaFilter('all');
    setSearchKeyword('');
  };

  const handleEnterSection = (type: string) => {
    setActiveTab(type);
    setCurrentView('list');
  };

  const handleBack = () => {
    setCurrentView('home');
    loadStats();
  };

  // Publish
  const handlePublish = async () => {
    if (!publishForm.title.trim()) return;
    try {
      const tags = publishForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        title: publishForm.title,
        content: publishForm.content,
        post_type: publishForm.post_type,
        category_id: publishForm.category_id || null,
        share_type: publishForm.share_type || null,
        is_pinned: publishForm.is_pinned,
        tags,
        author_id: currentUser?.id || null,
        author_name: currentUser?.name || null,
      };
      const res = await fetch('/api/knowledge/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.data) {
        // Upload attachments
        if (uploadFiles.length > 0 && json.data.id) {
          const formData = new FormData();
          uploadFiles.forEach(f => formData.append('files', f));
          await fetch(`/api/knowledge/upload?post_id=${json.data.id}`, { method: 'POST', body: formData });
        }
        setShowPublishDialog(false);
        resetPublishForm();
        loadPosts();
        loadStats();
      }
    } catch (e) { console.error('Failed to publish:', e); }
  };

  const resetPublishForm = () => {
    setPublishForm({ title: '', content: '', post_type: activeTab, category_id: '', share_type: '', is_pinned: false, tags: '' });
    setUploadFiles([]);
  };

  // Like/Favorite
  const handleLike = async (postId: string) => {
    try {
      await fetch(`/api/knowledge/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser?.id, user_name: currentUser?.name }),
      });
      loadPosts();
      if (selectedPost?.id === postId) loadPostDetail(postId);
    } catch (e) { console.error(e); }
  };

  const handleFavorite = async (postId: string) => {
    try {
      await fetch(`/api/knowledge/posts/${postId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser?.id, user_name: currentUser?.name }),
      });
      loadPosts();
      if (selectedPost?.id === postId) loadPostDetail(postId);
    } catch (e) { console.error(e); }
  };

  // Detail
  const loadPostDetail = async (postId: string) => {
    try {
      // Mark as read
      fetch(`/api/knowledge/posts/${postId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser?.id, user_name: currentUser?.name }),
      });
      const res = await fetch(`/api/knowledge/posts/${postId}`);
      const json = await res.json();
      if (json.data) {
        setSelectedPost(json.data.post);
        setDetailComments(json.data.comments || []);
        setShowDetailDialog(true);
      }
    } catch (e) { console.error(e); }
  };

  // Comment
  const handleComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    try {
      await fetch(`/api/knowledge/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, author_id: currentUser?.id, author_name: currentUser?.name }),
      });
      setNewComment('');
      loadPostDetail(selectedPost.id);
    } catch (e) { console.error(e); }
  };

  // Download
  const handleDownload = async (att: Attachment) => {
    try {
      const res = await fetch(`/api/knowledge/download?file_url=${encodeURIComponent(att.file_url)}&file_name=${encodeURIComponent(att.file_name)}`);
      const json = await res.json();
      if (json.data?.url) {
        const response = await fetch(json.data.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = att.file_name;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); }
  };

  // Categories for current tab
  const currentCategories = categories.filter(c => c.category_type === activeTab);

  // ==================== HOME VIEW ====================
  const renderHomeView = () => {
    const cards = [
      {
        key: 'announcement',
        title: '公告通知',
        desc: '全员公告与重要通知',
        icon: <Megaphone className="w-12 h-12" />,
        count: stats.announcement,
        glowColor: 'shadow-amber-500/20',
        borderColor: 'hover:border-amber-300/60',
        iconBg: 'bg-gradient-to-br from-amber-100/80 to-orange-100/80',
        iconColor: 'text-amber-600',
        badgeBg: 'bg-amber-100/60',
        badgeColor: 'text-amber-700',
      },
      {
        key: 'material',
        title: '共享资料',
        desc: '文档视频供查询下载',
        icon: <BookOpen className="w-12 h-12" />,
        count: stats.material,
        glowColor: 'shadow-blue-500/20',
        borderColor: 'hover:border-blue-300/60',
        iconBg: 'bg-gradient-to-br from-blue-100/80 to-indigo-100/80',
        iconColor: 'text-blue-600',
        badgeBg: 'bg-blue-100/60',
        badgeColor: 'text-blue-700',
      },
      {
        key: 'share',
        title: '经验分享',
        desc: '人人可发的经验与心得',
        icon: <Lightbulb className="w-12 h-12" />,
        count: stats.share,
        glowColor: 'shadow-emerald-500/20',
        borderColor: 'hover:border-emerald-300/60',
        iconBg: 'bg-gradient-to-br from-emerald-100/80 to-green-100/80',
        iconColor: 'text-emerald-600',
        badgeBg: 'bg-emerald-100/60',
        badgeColor: 'text-emerald-700',
      },
    ];

    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full px-4">
          {cards.map(card => (
            <div
              key={card.key}
              onClick={() => handleEnterSection(card.key)}
              className={`group cursor-pointer bg-white/60 backdrop-blur-xl rounded-3xl border border-white/30 ${card.borderColor} shadow-lg ${card.glowColor} hover:shadow-xl hover:-translate-y-2 transition-all duration-500 overflow-hidden`}
            >
              <div className="p-10 text-center">
                <div className={`w-24 h-24 ${card.iconBg} backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <div className={card.iconColor}>{card.icon}</div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 mb-5">{card.desc}</p>
                <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full ${card.badgeBg} ${card.badgeColor} text-sm font-medium`}>
                  <span className="text-lg font-bold">{card.count}</span>
                  <span>篇内容</span>
                </div>
                <div className="mt-6 flex items-center justify-center text-sm text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                  <span>进入查看</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==================== LIST VIEW ====================
  const renderListView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['announcement', 'material', 'share'].map(type => (
              <button
                key={type}
                onClick={() => handleTabChange(type)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === type
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {POST_TYPE_MAP[type]}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => { resetPublishForm(); setPublishForm(f => ({ ...f, post_type: activeTab })); setShowPublishDialog(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> 发布
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索..."
            value={searchKeyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
            className="pl-9"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') loadPosts(); }}
          />
        </div>
        {currentCategories.length > 0 && (
          <Select value={selectedCategory} onValueChange={v => { setSelectedCategory(v); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="全部分类" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {currentCategories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {activeTab === 'material' && (
          <Select value={mediaFilter} onValueChange={v => { setMediaFilter(v); }}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="全部类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="document">📄 文档</SelectItem>
              <SelectItem value="video">🎬 视频</SelectItem>
              <SelectItem value="other">📦 其他</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={() => loadPosts()}>搜索</Button>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无内容</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div
              key={post.id}
              onClick={() => loadPostDetail(post.id)}
              className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.is_pinned && <Pin className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <h4 className="font-medium text-gray-900 truncate">{post.title}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author_name || '匿名'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(post.created_at)}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.like_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comment_count}</span>
                  </div>
                  {/* Attachments preview for material */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {post.attachments.slice(0, 3).map(att => (
                        <span key={att.id} className="inline-flex items-center gap-1 text-xs bg-gray-50 rounded px-2 py-0.5 text-gray-500">
                          {MEDIA_TYPE_ICON[att.media_type] || <Folder className="w-3 h-3" />}
                          {att.file_name}
                          {att.media_type === 'video' && att.duration ? ` (${formatDuration(att.duration)})` : ''}
                        </span>
                      ))}
                      {post.attachments.length > 3 && <span className="text-xs text-gray-400">+{post.attachments.length - 3}个文件</span>}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {post.share_type && (
                    <Badge variant="outline" className="text-xs">{SHARE_TYPE_MAP[post.share_type] || post.share_type}</Badge>
                  )}
                  {post.post_type === 'announcement' && post.is_pinned && (
                    <Badge className="bg-red-50 text-red-600 text-xs">置顶</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ==================== DETAIL DIALOG ====================
  const renderDetailDialog = () => {
    if (!selectedPost) return null;
    return (
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPost.is_pinned && <Pin className="w-4 h-4 text-red-500" />}
              {selectedPost.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Meta */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{selectedPost.author_name || '匿名'}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDate(selectedPost.created_at)}</span>
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{selectedPost.view_count}次浏览</span>
              {selectedPost.post_type === 'announcement' && selectedPost._totalUsers !== undefined && (
                <span>已读 {selectedPost._readCount || 0}/{selectedPost._totalUsers}</span>
              )}
            </div>
            {/* Tags */}
            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {selectedPost.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
            {/* Content */}
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 border-t pt-4">
              {selectedPost.content}
            </div>
            {/* Attachments */}
            {selectedPost.attachments && selectedPost.attachments.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">附件</h4>
                <div className="space-y-2">
                  {selectedPost.attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {MEDIA_TYPE_ICON[att.media_type] || <Folder className="w-4 h-4" />}
                        <span className="text-sm truncate">{att.file_name}</span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatFileSize(att.file_size)}
                          {att.media_type === 'video' && att.duration ? ` · ${formatDuration(att.duration)}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {att.media_type === 'video' && (
                          <Button variant="outline" size="sm" onClick={() => {
                            // Open video in a new dialog or inline player
                            window.open(att.file_url, '_blank');
                          }}>
                            <Play className="w-3 h-3 mr-1" /> 播放
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDownload(att)}>
                          <Download className="w-3 h-3 mr-1" /> 下载
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Actions */}
            <div className="border-t pt-4 flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => handleLike(selectedPost.id)}>
                <ThumbsUp className={`w-4 h-4 mr-1 ${selectedPost._liked ? 'text-indigo-500 fill-indigo-500' : ''}`} />
                点赞 ({selectedPost.like_count})
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleFavorite(selectedPost.id)}>
                <Star className={`w-4 h-4 mr-1 ${selectedPost._favorited ? 'text-amber-500 fill-amber-500' : ''}`} />
                收藏
              </Button>
              <span className="text-sm text-gray-400">
                <MessageCircle className="w-4 h-4 inline mr-1" />
                评论 ({selectedPost.comment_count})
              </span>
            </div>
            {/* Comments */}
            {detailComments.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">评论</h4>
                {detailComments.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="font-medium text-gray-700">{c.author_name || '匿名'}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
            {/* New comment */}
            <div className="flex gap-2">
              <Input
                placeholder="写下你的评论..."
                value={newComment}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleComment(); }}
              />
              <Button size="sm" onClick={handleComment}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ==================== PUBLISH DIALOG ====================
  const renderPublishDialog = () => {
    const publishCategories = categories.filter(c => c.category_type === publishForm.post_type);
    return (
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>发布{POST_TYPE_MAP[publishForm.post_type] || '内容'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">标题</label>
              <Input
                value={publishForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublishForm(f => ({ ...f, title: e.target.value }))}
                placeholder="请输入标题"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">分类</label>
              <Select value={publishForm.category_id} onValueChange={v => setPublishForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                <SelectContent>
                  {publishCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {publishForm.post_type === 'share' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">分享类型</label>
                <Select value={publishForm.share_type} onValueChange={v => setPublishForm(f => ({ ...f, share_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="选择分享类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="experience">实施经验</SelectItem>
                    <SelectItem value="solution">问题解决</SelectItem>
                    <SelectItem value="best_practice">最佳实践</SelectItem>
                    <SelectItem value="tool">工具推荐</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">内容</label>
              <Textarea
                value={publishForm.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPublishForm(f => ({ ...f, content: e.target.value }))}
                placeholder="请输入内容"
                rows={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">标签（用逗号分隔）</label>
              <Input
                value={publishForm.tags}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublishForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="标签1, 标签2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">附件</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <input
                  type="file"
                  multiple
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files) setUploadFiles(Array.from(e.target.files));
                  }}
                  className="hidden"
                  id="knowledge-file-upload"
                />
                <label htmlFor="knowledge-file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">点击上传文件</p>
                  <p className="text-xs text-gray-400 mt-1">支持文档、视频、压缩包等</p>
                </label>
              </div>
              {uploadFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm">
                      <span className="truncate">{f.name}</span>
                      <button onClick={() => setUploadFiles(files => files.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {publishForm.post_type === 'announcement' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pin-checkbox"
                  checked={publishForm.is_pinned}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublishForm(f => ({ ...f, is_pinned: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="pin-checkbox" className="text-sm text-gray-700">置顶</label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>取消</Button>
            <Button onClick={handlePublish} disabled={!publishForm.title.trim()}>发布</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ==================== RENDER ====================
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">信息广场</h2>
        {currentView === 'home' ? renderHomeView() : renderListView()}
      </div>
      {renderDetailDialog()}
      {renderPublishDialog()}
    </div>
  );
}
