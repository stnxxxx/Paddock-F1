"use client"

import { Modal } from "@/components/ui/modal"
import { HelpCircle, Users2, Wallet, Star, ArrowLeftRight, TrendingUp, Target, Trophy } from "lucide-react"
import { useState } from "react"

function Item({ icon: Icon, title, children }: { icon: typeof Wallet; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--color-accent-soft)" }}>
        <Icon className="h-4 w-4 text-[--accent]" />
      </span>
      <div>
        <div className="text-[13px] font-semibold text-[--text-primary]">{title}</div>
        <div className="text-[12px] leading-relaxed text-[--text-secondary]">{children}</div>
      </div>
    </div>
  )
}

export function FantasyHelp() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-[--border-default] px-2.5 py-1.5 text-xs font-medium text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
      >
        <HelpCircle className="h-3.5 w-3.5" /> Как это работает
      </button>

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title="Как работает фэнтези">
        <div className="space-y-4">
          <p className="text-[12px] leading-relaxed text-[--text-muted]">
            Два режима в одном разделе. Переключай вкладки <b className="text-[--text-secondary]">«Команда»</b> и <b className="text-[--text-secondary]">«Прогнозы»</b> сверху.
          </p>

          <div>
            <div className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-[--text-primary]"><Users2 className="h-4 w-4" /> Команда</div>
            <div className="space-y-3">
              <Item icon={Wallet} title="Собери состав в рамках бюджета">
                $100M на <b>5 пилотов</b> и <b>2 конструктора</b>. Сильнейшие — дороже, поэтому приходится искать баланс и недооценённых.
              </Item>
              <Item icon={Star} title="Назначь капитана">
                Очки капитана удваиваются (×2). Выбирай того, кто, по-твоему, выстрелит на этом этапе.
              </Item>
              <Item icon={ArrowLeftRight} title="Трансферы между гонками">
                2 замены бесплатно каждый этап, дальше −10 очков за каждую. Состав сохраняется и переносится на следующий этап.
              </Item>
              <Item icon={TrendingUp} title="Очки и цены">
                Пилоты приносят очки за квалификацию, финиш, отыгранные позиции, быстрый круг (за сходы — минус). Конструктор = сумма пилотов + бонусы. После каждой гонки цены двигаются по результатам, форме и спросу — дешёвый «выстреливший» дорожает.
              </Item>
            </div>
          </div>

          <div>
            <div className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-[--text-primary]"><Target className="h-4 w-4" /> Прогнозы</div>
            <div className="space-y-3">
              <Item icon={Target} title="Угадай исход этапа">
                На каждую гонку — несколько вопросов: победитель, подиум, поул, быстрый круг, первый сход. Очки начисляются за угаданное по реальным результатам.
              </Item>
              <Item icon={Trophy} title="Соревнуйся">
                Общий зачёт по очкам + приватные мини-лиги по коду — зови друзей и меряйтесь результатами.
              </Item>
            </div>
          </div>

          <p className="rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-[11px] text-[--text-muted]">
            Дедлайн на оба режима — старт квалификации этапа. После него состав и прогнозы блокируются до конца гонки.
          </p>
        </div>
      </Modal>
    </>
  )
}
