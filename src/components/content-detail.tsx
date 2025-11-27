"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Content } from "@/components/data-table/columns"

interface ContentDetailProps {
  content: Content | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function renderCurriculum(curriculum: unknown): React.ReactNode {
  if (!curriculum || !Array.isArray(curriculum) || curriculum.length === 0) {
    return null
  }
  return (
    <div>
      <h4 className="font-medium text-sm text-muted-foreground mb-2">학습내용(목차)</h4>
      <ol className="text-sm space-y-1 list-decimal list-inside">
        {(curriculum as string[]).map((item, index) => (
          <li key={index} className="text-sm">
            {String(item)}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function ContentDetail({ content, open, onOpenChange }: ContentDetailProps) {
  if (!content) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{content.courseName}</DialogTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{content.category}</Badge>
            {content.status && <Badge>{content.status}</Badge>}
          </div>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">기본 정보</TabsTrigger>
            <TabsTrigger value="course">과정 상세</TabsTrigger>
            <TabsTrigger value="price">가격/판매</TabsTrigger>
            <TabsTrigger value="meta">메타 정보</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="대분류" value={content.majorCategory} />
              <InfoItem label="중분류" value={content.middleCategory} />
              <InfoItem label="소분류" value={content.minorCategory} />
              <InfoItem label="구분" value={content.category} />
              <InfoItem label="0차" value={content.level0} />
              <InfoItem label="1차" value={content.level1} />
              <InfoItem label="2차" value={content.level2} />
              <InfoItem label="3차" value={content.level3} />
              <InfoItem label="세부내용" value={content.detailContent} />
              <InfoItem label="자격증 여부" value={content.certificationStatus} />
            </div>
            {content.note && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">비고</h4>
                <p className="text-sm">{content.note}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="course" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="상태" value={content.status} />
              <InfoItem label="차시" value={`${content.sessions}차시`} />
              <InfoItem label="개발연도" value={content.developmentYear} />
              <InfoItem label="SME" value={content.sme} />
              <InfoItem label="교육기간" value={content.educationPeriod} />
            </div>
            {content.courseIntro && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">과정소개</h4>
                <p className="text-sm whitespace-pre-wrap">{content.courseIntro}</p>
              </div>
            )}
            {renderCurriculum(content.curriculum)}
            {content.learningObjective && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">학습목표</h4>
                <p className="text-sm whitespace-pre-wrap">{content.learningObjective}</p>
              </div>
            )}
            {content.targetAudience && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">학습대상</h4>
                <p className="text-sm whitespace-pre-wrap">{content.targetAudience}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="price" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                label="교육비(도서비제외)"
                value={`${content.educationFee.toLocaleString()}원`}
              />
              <InfoItem
                label="총 교육비(도서비포함)"
                value={content.totalFee ? `${content.totalFee.toLocaleString()}원` : null}
              />
              <InfoItem
                label="DSBL보존가(도서제외)"
                value={content.dsblPrice ? `${content.dsblPrice.toLocaleString()}원` : null}
              />
              <InfoItem label="도서비" value={content.bookFee} />
              <InfoItem label="도서필수" value={content.bookRequired} />
              <InfoItem label="턴키가능여부" value={content.turnkeyAvailable} />
            </div>
            {content.sampleLink && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">맛보기</h4>
                <a
                  href={content.sampleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {content.sampleLink}
                </a>
              </div>
            )}
          </TabsContent>

          <TabsContent value="meta" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="ID" value={content.id.toString()} />
              <InfoItem label="코스 ID" value={content.courseId} />
              <InfoItem label="콘텐츠 ID" value={content.contentId} />
              <InfoItem label="카테고리 코드" value={content.categoryCode} />
              <InfoItem label="카테고리 참조" value={content.categoryRef} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <h4 className="font-medium text-sm text-muted-foreground">{label}</h4>
      <p className="text-sm">{value || "-"}</p>
    </div>
  )
}
