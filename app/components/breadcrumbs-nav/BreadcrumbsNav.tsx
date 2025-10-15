"use client";

import Link from "next/link";
import { Breadcrumbs, Typography } from "@mui/material";
import { BreadcrumbsItem } from "@/app/types/types";

export default function BreadcrumbsNav({ items }: { items: BreadcrumbsItem[] }) {
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {items.map((it, i) =>
        it.href ? (
          <Typography
            key={i}
            component={Link}
            href={it.href}
            color="inherit"
            sx={{ textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            {it.label}
          </Typography>
        ) : (
          <Typography key={i} color="text.primary">
            {it.label}
          </Typography>
        )
      )}
    </Breadcrumbs>
  );
}
