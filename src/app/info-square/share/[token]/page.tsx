"use client";

import { useParams } from "next/navigation";
import ShareView from "@/components/info-square/share-view";

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;

  return <ShareView token={token} />;
}
