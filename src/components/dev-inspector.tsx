"use client";

import dynamic from "next/dynamic";

const InspectorDynamic = dynamic(
  () => import("react-dev-inspector").then((mod) => ({ default: mod.Inspector })),
  { ssr: false }
);

export function DevInspector() {
  return <InspectorDynamic />;
}
