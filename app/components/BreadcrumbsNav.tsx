"use client";

import Link from "next/link";
import { Breadcrumbs, Typography } from "@mui/material";

type Item = { label: string; href?: string };

export default function BreadcrumbsNav({ items }: { items: Item[] }) {
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
