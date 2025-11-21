"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Content = {
  id: number
  majorCategory: string
  middleCategory: string
  minorCategory: string
  level0: string | null
  level1: string | null
  level2: string | null
  level3: string | null
  detailContent: string | null
  certificationStatus: string | null
  note: string | null
  category: string
  categoryCode: string
  courseName: string
  categoryRef: string
  status: string | null
  sessions: number
  courseIntro: string | null
  curriculum: string[] | null | unknown
  developmentYear: string | null
  sme: string | null
  educationFee: number
  totalFee: number | null
  sampleLink: string | null
  courseId: string | null
  contentId: string | null
  dsblPrice: number | null
  turnkeyAvailable: string | null
  targetAudience: string | null
  learningObjective: string | null
  educationPeriod: string | null
  bookFee: string | null
  bookRequired: string | null
}

interface ColumnsProps {
  onView: (content: Content) => void
  onEdit: (content: Content) => void
  onDelete: (content: Content) => void
}

export function getColumns({ onView, onEdit, onDelete }: ColumnsProps): ColumnDef<Content>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "category",
      header: "구분",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("category")}</Badge>
      ),
    },
    {
      accessorKey: "majorCategory",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          대분류
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "middleCategory",
      header: "중분류",
    },
    {
      accessorKey: "courseName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          과정명
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.getValue("courseName")}>
          {row.getValue("courseName")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return status ? (
          <Badge variant={status === "완료" ? "default" : "secondary"}>
            {status}
          </Badge>
        ) : null
      },
    },
    {
      accessorKey: "sessions",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          차시
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">{row.getValue("sessions")}차시</div>
      ),
    },
    {
      accessorKey: "educationFee",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          교육비
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("educationFee"))
        const formatted = new Intl.NumberFormat("ko-KR", {
          style: "currency",
          currency: "KRW",
        }).format(amount)
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "developmentYear",
      header: "개발연도",
    },
    {
      accessorKey: "courseId",
      header: "코스 ID",
      cell: ({ row }) => (
        <div className="max-w-[100px] truncate" title={row.getValue("courseId") || ""}>
          {row.getValue("courseId") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "contentId",
      header: "콘텐츠 ID",
      cell: ({ row }) => (
        <div className="max-w-[100px] truncate" title={row.getValue("contentId") || ""}>
          {row.getValue("contentId") || "-"}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const content = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(content)}>
                상세 보기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(content)}>
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(content)}
                className="text-red-600"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
