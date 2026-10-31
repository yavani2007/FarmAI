import "./Sidebar.css";

function Icon({ type }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (type === "dashboard") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  if (type === "scanner") {
    return (
      <svg {...commonProps}>
        <path d="M4 7V5a1 1 0 0 1 1-1h2" />
        <path d="M17 4h2a1 1 0 0 1 1 1v2" />
        <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
        <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  }

  if (type === "advisory") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5" />
      </svg>
    );
  }

  if (type === "chatbot") {
    return (
      <svg {...commonProps}>
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="M8 10h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }

  if (type === "analytics") {
    return (
      <svg {...commonProps}>
        <path d="M5 19V9" />
        <path d="M12 19V5" />
        <path d="M19 19v-7" />
        <path d="M3 19h18" />
      </svg>
    );
  }

  if (type === "monitoring") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 15l3-3 2 2 4-5" />
      </svg>
    );
  }

  if (type === "reports") {
    return (
      <svg {...commonProps}>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    );
  }

  if (type === "about") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>
    );
  }

  if (type === "logout") {
    return (
      <svg {...commonProps}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H4" />
        <path d="M20 4v16" />
      </svg>
    );
  }

  return null;
}

function Sidebar({ currentPage }) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      hash: "#dashboard",
    },
    {
      id: "scanner",
      label: "AI Scanner",
      icon: "scanner",
      hash: "#scanner",
    },
    {
      id: "advisory",
      label: "Advisory",
      icon: "advisory",
      hash: "#advisory",
    },
    {
      id: "chatbot",
      label: "AI Chatbot",
      icon: "chatbot",
      hash: "#chatbot",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "analytics",
      hash: "#analytics",
    },
    {
      id: "monitoring",
      label: "Monitoring",
      icon: "monitoring",
      hash: "#monitoring",
    },
    {
      id: "reports",
      label: "Reports",
      icon: "reports",
      hash: "#reports",
    },
    {
      id: "about",
      label: "About",
      icon: "about",
      hash: "#about",
    },
  ];

  const handleLogout = () => {
    window.location.hash = "#login";
  };

  return (
    <aside className="app-sidebar">

      <div className="sidebar-top">

        <button
          type="button"
          className="sidebar-menu-button"
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

      </div>

      <nav className="sidebar-navigation">

        {menuItems.map((item) => (
          <a
            key={item.id}
            href={item.hash}
            className={`sidebar-item ${
              currentPage === item.id ? "active" : ""
            }`}
            title={item.label}
            aria-label={item.label}
          >
            <span className="sidebar-icon">
              <Icon type={item.icon} />
            </span>

            <span className="sidebar-tooltip">
              {item.label}
            </span>
          </a>
        ))}

      </nav>

      <div className="sidebar-bottom">

        <button
          type="button"
          className="sidebar-item logout-item"
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
        >
          <span className="sidebar-icon">
            <Icon type="logout" />
          </span>

          <span className="sidebar-tooltip">
            Logout
          </span>
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;