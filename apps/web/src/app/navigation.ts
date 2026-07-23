import {
  ArrowLeftRight,
  LayoutDashboard,
  LucideIcon,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { AppRoute } from "./router-store";

export interface NavigationItem {
  route: AppRoute;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const navigation: readonly NavigationItem[] = [
  {
    route: "dashboard",
    label: "Обзор",
    shortLabel: "Обзор",
    icon: LayoutDashboard,
  },
  {
    route: "accounts",
    label: "Инвесторы",
    shortLabel: "Счета",
    icon: UsersRound,
  },
  {
    route: "trading",
    label: "Торговля",
    shortLabel: "Сделка",
    icon: ArrowLeftRight,
  },
  {
    route: "settlements",
    label: "Распределения",
    shortLabel: "Выплаты",
    icon: ReceiptText,
  },
];

export const routeMeta: Record<AppRoute, { title: string; eyebrow: string }> = {
  dashboard: { title: "Портфель", eyebrow: "Общий обзор" },
  accounts: { title: "Инвесторы", eyebrow: "Подключённые счета" },
  trading: { title: "Торговый терминал", eyebrow: "Пакетное исполнение" },
  settlements: { title: "Распределения", eyebrow: "Прибыль и выплаты" },
};
