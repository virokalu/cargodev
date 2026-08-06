"use client";

// Makes a vehicles-table row navigate to the vehicle's detail page (US-10)
// on click, without turning the whole (deliberately server-rendered) table
// into a client component — same "isolate the one interactive bit into a
// small leaf" pattern as DetailPaneTable/StatusScrollProvider in
// status-scroll-context.tsx. Row clicks must not hijack the Edit/Delete
// buttons or the Auction Bill Paid / Row Colour Status dropdowns nested
// inside the row, so anything landing on a real interactive element is
// left alone — only a click on plain cell content navigates.

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const INTERACTIVE_SELECTOR = "a, button, [role='button'], select, input";

export function ClickableRow({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      style={style}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
