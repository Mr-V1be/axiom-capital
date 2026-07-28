import { Bell, Search, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "../shared/ui/Modal";
import { navigation } from "./navigation";
import { AppRoute } from "./router-store";

export type HeaderOverlayMode = "search" | "notifications" | "profile" | null;

interface Props {
  mode: HeaderOverlayMode;
  onClose(): void;
  onNavigate(route: AppRoute): void;
}

export function HeaderOverlay({ mode, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("ru");
    return value
      ? navigation.filter((item) => item.label.toLocaleLowerCase("ru").includes(value))
      : navigation;
  }, [query]);
  const navigate = (route: AppRoute) => {
    onNavigate(route);
    onClose();
  };

  if (mode === "search") {
    return (
      <Modal open title="Быстрый поиск" onClose={onClose}>
        <label className="header-search">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Раздел приложения"
          />
        </label>
        <div className="header-menu-list">
          {matches.map((item) => (
            <button key={item.route} onClick={() => navigate(item.route)}>
              <item.icon size={17} />
              <span>{item.label}</span>
            </button>
          ))}
          {!matches.length && <p>Раздел не найден</p>}
        </div>
      </Modal>
    );
  }
  if (mode === "notifications") {
    return (
      <Modal open title="Уведомления" onClose={onClose}>
        <div className="header-empty-state">
          <Bell size={22} />
          <strong>Новых уведомлений нет</strong>
          <span>Ошибки MEXC отображаются в соответствующем разделе.</span>
        </div>
      </Modal>
    );
  }
  if (mode === "profile") {
    return (
      <Modal open title="Профиль" onClose={onClose}>
        <div className="header-profile-summary">
          <span className="avatar"><UserRound size={15} /></span>
          <div><strong>Evgeniy</strong><span>Управляющий Axiom Fund</span></div>
        </div>
        <div className="header-profile-security">
          <ShieldCheck size={17} />
          Доступ защищён серверной аутентификацией
        </div>
        <div className="header-menu-list">
          <button onClick={() => navigate("accounts")}>Управление счетами</button>
          <button onClick={() => navigate("settlements")}>Распределения</button>
        </div>
      </Modal>
    );
  }
  return null;
}
