import {
  Bell,
  ChevronDown,
  Command,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { PropsWithChildren, useState } from "react";
import { Button } from "../shared/ui/Button";
import { navigation, routeMeta } from "./navigation";
import { AppRoute, routerStore } from "./router-store";

interface AppShellProps {
  route: AppRoute;
}

export function AppShell({
  route,
  children,
}: PropsWithChildren<AppShellProps>) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const meta = routeMeta[route];

  const navigate = (next: AppRoute) => {
    routerStore.navigate(next);
    setMobileMenu(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand__mark">A</div>
          <div>
            <strong>AXIOM</strong>
            <span>CAPITAL</span>
          </div>
          <button className="sidebar__close" onClick={() => setMobileMenu(false)}>
            <X size={19} />
            <span className="visually-hidden">Закрыть меню</span>
          </button>
        </div>
        <div className="workspace-switcher">
          <div className="avatar avatar--team">AC</div>
          <div>
            <small>Пространство</small>
            <strong>Axiom Fund</strong>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav className="sidebar-nav" aria-label="Основная навигация">
          <span className="sidebar-nav__label">Управление</span>
          {navigation.map((item) => (
            <button
              key={item.route}
              className={item.route === route ? "active" : ""}
              onClick={() => navigate(item.route)}
            >
              <item.icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__security">
          <ShieldCheck size={18} />
          <div>
            <strong>Защищённый режим</strong>
            <span>Приложение не выполняет вывод</span>
          </div>
        </div>
        <div className="sidebar__profile">
          <div className="avatar">EV</div>
          <div>
            <strong>Evgeniy</strong>
            <span>Управляющий</span>
          </div>
          <button className="icon-button">
            <ChevronDown size={15} />
            <span className="visually-hidden">Меню профиля</span>
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="sidebar-overlay"
          onClick={() => setMobileMenu(false)}
          aria-label="Закрыть меню"
        />
      )}
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileMenu(true)}>
            <Menu size={20} />
            <span className="visually-hidden">Открыть меню</span>
          </button>
          <div>
            <span className="eyebrow">{meta.eyebrow}</span>
            <h1>{meta.title}</h1>
          </div>
          <div className="topbar__actions">
            <button className="command-button">
              <Command size={15} />
              <span>Быстрый поиск</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="icon-button notification-button">
              <Bell size={18} />
              <span className="notification-dot" />
              <span className="visually-hidden">Уведомления</span>
            </button>
            <Button variant="primary" onClick={() => navigate("trading")}>
              <Plus size={16} />
              Новая сделка
            </Button>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {navigation.map((item) => (
          <button
            key={item.route}
            className={item.route === route ? "active" : ""}
            onClick={() => navigate(item.route)}
          >
            <item.icon size={19} />
            <span>{item.shortLabel}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
