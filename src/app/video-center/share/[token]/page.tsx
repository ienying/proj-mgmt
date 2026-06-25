"use client";

import { useParams } from "next/navigation";
import VideoShareView from "@/components/video-center/video-share-view";

export default function VideoSharePage() {
  const params = useParams();
  const token = params?.token as string;

  return <VideoShareView token={token} />;
}
