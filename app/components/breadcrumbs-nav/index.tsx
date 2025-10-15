"use client";

import dynamic from "next/dynamic";
import { Breadcrumbs, Typography, Skeleton } from "@mui/material";
import { BreadcrumbsItem } from "@/app/types/types";

function BreadcrumbsNavSkeleton({ items }: { items: BreadcrumbsItem[] }) {
  const widths = items.map((it) => Math.max(48, Math.min(200, it.label.length * 10)));
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {widths.map((w, i) => (
        <Typography key={i} sx={{ lineHeight: "24px", minHeight: 24 }}>
          <Skeleton variant="text" width={w} height={24} />
        </Typography>
      ))}
    </Breadcrumbs>
  );
}

export const BreadcrumbsNavClientOnly = dynamic(
  () => import("./BreadcrumbsNav"),
  {
    ssr: false,
    loading: () => <BreadcrumbsNavSkeleton items={[{ label: "…" }]} />,
  }
);
