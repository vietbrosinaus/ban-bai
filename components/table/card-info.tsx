"use client";

import * as React from "react";
import { BookOpenText, Heart, Sparkles } from "lucide-react";

import { FACTION_FILL, PlayingCard } from "@/components/table/playing-card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SuitMark } from "@/components/table/suit-mark";
import { MetaList } from "@/components/ui/meta-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORY_LABEL, ROLE_LABEL, cardFace, cardRules } from "@/lib/domain/deck";
import { FACTION_LABEL, type CardId } from "@/lib/domain/card";
import { cn } from "@/lib/utils";

function SuitRank({ cardId, className }: { cardId: CardId; className?: string }) {
  const card = cardFace(cardId);
  if (!card || card.kind === "general") return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-serif font-bold tabular-nums", className)}>
      {card.rank}
      <SuitMark suit={card.suit} />
    </span>
  );
}

function CardInfoHeader({ cardId }: { cardId: CardId }) {
  const card = cardFace(cardId);
  const rules = cardRules(cardId);
  if (!card) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {rules?.kind === "general" ? (
        <>
          <Badge className="border-0 bg-[#17241f] text-white">Tướng</Badge>
          <Badge className={cn("border-0 text-white", FACTION_FILL[rules.faction])}>{FACTION_LABEL[rules.faction]}</Badge>
          <Badge variant="outline" className="gap-1">
            <Heart className="fill-current" />
            {rules.maxHp}
          </Badge>
        </>
      ) : (
        <>
          {rules?.kind === "play" ? <Badge className="border-0 bg-[#17241f] text-white">{ROLE_LABEL[rules.role]}</Badge> : null}
          {rules?.kind === "play" && CATEGORY_LABEL[rules.category] !== ROLE_LABEL[rules.role] ? (
            <Badge variant="secondary">{CATEGORY_LABEL[rules.category]}</Badge>
          ) : null}
          <Badge variant="outline">
            <SuitRank cardId={cardId} />
          </Badge>
        </>
      )}
    </div>
  );
}

function CardInfoBody({ cardId }: { cardId: CardId }) {
  const rules = cardRules(cardId);
  if (!rules) return <p className="text-sm text-muted-foreground">Lá này chưa có mô tả luật.</p>;

  if (rules.kind === "general") {
    return (
      <div className="grid gap-2.5">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Sparkles className="size-4" />
          Kỹ năng
        </h3>
        {rules.skills.map((skill) => (
          <article key={skill.id} className="rounded-xl border bg-muted/40 p-3.5">
            <h4 className="text-sm font-semibold">{skill.nameVi}</h4>
            <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">{skill.descriptionVi}</p>
          </article>
        ))}
        {!rules.skills.length && <p className="text-sm text-muted-foreground">Tướng này chưa có kỹ năng trong dữ liệu.</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex gap-3 rounded-xl border bg-muted/40 p-3.5">
        <BookOpenText className="mt-0.5 size-5 shrink-0 text-ring" />
        <div>
          <b className="text-xs font-semibold">Luật</b>
          <p className="mt-1 text-sm leading-relaxed">{rules.ruleVi}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{rules.ruleEn}</p>
    </div>
  );
}

function CardInfo({ cardId, className, ...props }: React.ComponentProps<"div"> & { cardId: CardId }) {
  const card = cardFace(cardId);
  const rules = cardRules(cardId);
  if (!card) return null;
  return (
    <div data-slot="card-info" className={cn("grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]", className)} {...props}>
      <PlayingCard cardId={cardId} size="lg" className="w-full" />
      <div className="grid content-start gap-3">
        <div className="grid gap-1.5">
          <h2 className="text-xl leading-tight font-semibold">{card.name}</h2>
          {rules?.kind === "play" ? (
            <MetaList className="text-xs text-muted-foreground">
              <span>{rules.nameEn}</span>
              <span className="opacity-70">chữ trên lá bài là tiếng Trung</span>
            </MetaList>
          ) : null}
          <CardInfoHeader cardId={cardId} />
        </div>
        <CardInfoBody cardId={cardId} />
      </div>
    </div>
  );
}

function CardInfoDialog({
  cardId,
  children,
  open,
  onOpenChange,
}: {
  cardId: CardId;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const card = cardFace(cardId);
  const rules = cardRules(cardId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="gap-4 sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{card?.name ?? cardId}</DialogTitle>
          <DialogDescription>
            {rules?.kind === "general" ? `${FACTION_LABEL[rules.faction]}, ${rules.maxHp} HP` : rules?.kind === "play" ? rules.nameEn : "Không có luật"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="-mr-4 pr-4 [&_[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-5rem)]">
          <CardInfo cardId={cardId} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function CardInfoPeek({ cardId, children }: { cardId: CardId; children: React.ReactNode }) {
  const card = cardFace(cardId);
  const rules = cardRules(cardId);
  if (!card) return children;
  return (
    <HoverCard openDelay={350} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="grid w-72 gap-2">
        <div className="flex items-center justify-between gap-2">
          <b className="text-sm font-semibold">{card.name}</b>
          <CardInfoHeader cardId={cardId} />
        </div>
        {rules?.kind === "general" ? (
          <MetaList className="flex-wrap text-xs text-muted-foreground">
            {rules.skills.map((skill) => (
              <span key={skill.id}>{skill.nameVi}</span>
            ))}
          </MetaList>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {rules?.kind === "play" ? rules.ruleVi : "Lá này chưa có mô tả luật."}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export { CardInfo, CardInfoDialog, CardInfoPeek };
