import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: T, index: number) => ReactNode;
}

interface ForzeoTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  stickyHeader?: boolean;
  emptyMessage?: string;
}

export function ForzeoTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  stickyHeader = false,
  emptyMessage = "No data available",
}: ForzeoTableProps<T>) {
  const getAlignment = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="fz-table">
        <thead className={cn(stickyHeader && "sticky top-0 bg-card z-10")}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(getAlignment(col.align))}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-8 text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={keyExtractor(item, index)}>
                {columns.map((col) => (
                  <td key={col.key} className={cn(getAlignment(col.align))}>
                    {col.render
                      ? col.render(item, index)
                      : (item as Record<string, unknown>)[col.key]?.toString() ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
