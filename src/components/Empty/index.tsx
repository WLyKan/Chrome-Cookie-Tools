import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export interface EmptyComponentProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

export default function EmptyComponent(
  {
    title = "No data",
    description = "No data found",
    icon,
    content
  }: EmptyComponentProps
) {

  return (
    <Empty>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">
          {icon}
        </EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
     {content && <EmptyContent>
        {content}
      </EmptyContent>}
    </Empty>
  )
}
