import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Empty from "@/components/Empty"
import { StorageType } from "@/types"

const mockData = [
  {
    type: "localStorage",
    content: "userSession",
    createdAt: "2025-11-25 14:22:45",
  },
  {
    type: "cookie",
    content: "authToken",
    createdAt: "2025-11-24 09:15:30",
  },
  {
    type: "localStorage | cookie",
    content: "preferences",
    createdAt: "2025-11-23 16:45:12",
  },
  {
    type: "localStorage",
    content: "cartItems",
    createdAt: "2025-11-22 10:30:00",
  },
  {
    type: "cookie",
    content: "sessionId",
    createdAt: "2025-11-21 13:55:22",
  },
]

export interface TableItem {
  type: StorageType
  content: string
  createdAt: string
}

export interface CustomTableProps {
  onRowClick?: (item: TableItem) => void
  data?: TableItem[]
}

export default function CustomTable({
  onRowClick,
  data = [],
}: CustomTableProps) {
  return (
    <Table className="table-fixed w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="overflow-hidden text-ellipsis whitespace-nowrap">Content</TableHead>
          <TableHead className="w-[128px] text-right overflow-hidden text-ellipsis whitespace-nowrap">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow
            key={index}
            onClick={() => onRowClick?.(item)}
            className={`${typeof onRowClick === 'function' ? 'cursor-pointer' : ''} hover:bg-muted/50`}
          >
            <TableCell className="font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={item.content}>{item.content}</TableCell>
            <TableCell className="w-[128px] text-right overflow-hidden text-ellipsis whitespace-nowrap" title={item.createdAt}>{item.createdAt}</TableCell>
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={2} className="text-center">
              <Empty
                title="No data"
                description="No data found"
              />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
