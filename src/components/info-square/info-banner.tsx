"use client";

import React, { useEffect, useState, useRef } from "react";
import { Megaphone } from "lucide-react";

interface Post {
  id: string;
  title: string;
  created_at: string;
}

export default function InfoBanner() {
  const [posts, setPosts] = useState<Post[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/knowledge/posts?is_pinned=true&page_size=20");
        const json = await res.json();
        if (json.data) {
          setPosts(json.data.slice(0, 20));
        }
        // If no pinned, get recent posts
        if (!json.data || json.data.length === 0) {
          const recentRes = await fetch("/api/knowledge/posts?page_size=10");
          const recentJson = await recentRes.json();
          if (recentJson.data) setPosts(recentJson.data.slice(0, 10));
        }
      } catch {}
    })();
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2">
        <Megaphone className="w-4 h-4 text-indigo-500 shrink-0" />
        <div ref={scrollRef} className="overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap flex gap-8">
            {[...posts, ...posts].map((post, i) => (
              <span key={i} className="text-sm text-gray-600 inline-block">
                {post.title}
                <span className="mx-4 text-gray-300">|</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
