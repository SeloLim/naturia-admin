"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ReactNode } from "react";

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  
  // Skip rendering breadcrumb on homepage
  if (pathname === "/") {
    return null;
  }

  // Split the pathname to get segments
  const segments = pathname.split("/").filter(Boolean);
  
  const breadcrumbItems: ReactNode[] = [];
  
  // Create breadcrumb items for each segment
  segments.forEach((segment, index) => {
    // Create the path to this point
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    
    // Check if this is the last segment (current page)
    const isLastSegment = index === segments.length - 1;
    
    // Format the segment name for display (capitalize and replace hyphens)
    const formattedName = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    // Add the breadcrumb item
    breadcrumbItems.push(
      <BreadcrumbItem key={href}>
        {isLastSegment ? (
          <BreadcrumbPage>{formattedName}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink href={href}>{formattedName}</BreadcrumbLink>
        )}
      </BreadcrumbItem>
    );
    
    // Add separator if not the last segment
    if (!isLastSegment) {
      breadcrumbItems.push(<BreadcrumbSeparator key={`${href}/separator`} />);
    }
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>{breadcrumbItems}</BreadcrumbList>
    </Breadcrumb>
  );
}