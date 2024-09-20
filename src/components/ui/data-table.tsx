import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
}

export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-lg border border-border bg-background-secondary shadow-md overflow-hidden">
      <Table>
        <TableHeader className="bg-background-secondary">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header, index) => (
                <TableHead
                  key={header.id}
                  className={`px-4 py-3 text-left text-sm font-medium text-text-lighter uppercase tracking-wider
                      ${index !== 0 ? "relative" : ""}`}
                >
                  {index !== 0 && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-px h-3/5 bg-border" />
                  )}
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, i) => (
              <TableRow
                key={row.id}
                className={`
                    border-b border-border last:border-b-0
                    ${i % 2 === 0 ? "bg-background" : "bg-background-secondary"}
                    hover:bg-list-hover transition-colors duration-200
                  `}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <TableCell
                    key={cell.id}
                    className={`px-4 py-3 text-sm relative`}
                  >
                    {index !== 0 && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-px h-3/5 bg-border" />
                    )}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-text-lighter"
              >
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
