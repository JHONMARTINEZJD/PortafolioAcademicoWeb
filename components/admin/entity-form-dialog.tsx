"use client"

import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface EntityFormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  onSubmit: (e: React.FormEvent) => void
  children: ReactNode
  submitLabel?: string
}

export function EntityFormDialog({
  open,
  onClose,
  title,
  description,
  onSubmit,
  children,
  submitLabel = "Guardar",
}: EntityFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card gap-0 p-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-card-foreground">{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="flex flex-col gap-4">{children}</div>
          </ScrollArea>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
