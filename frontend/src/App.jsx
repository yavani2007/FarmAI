import { useEffect, useState } from "react";

import Dashboard from "./Dashboard";
import Scanner from "./Scanner";
import Home from "./home";
import Login from "./login";
import Analytics from "./Analytics";
import AgriBuddy from "./AgriBuddy";
import Sidebar from "./Sidebar";

import {
  Advisory,
  Chatbot,
  Monitoring,
  Reports,
  About,
} from "./pages";

function getPage() {
  const hash = window.location.hash;

  if (hash === "" || hash === "#home") {
    return "home";
  }

  if (hash === "#dashboard") {
    return "dashboard";
  }

  if (hash === "#login") {
    return "login";
  }

  if (hash === "#scanner") {
    return "scanner";
  }

  if (hash === "#analytics") {
    return "analytics";
  }

  if (hash === "#advisory") {
    return "advisory";
  }

  if (hash === "#chatbot") {
    return "chatbot";
  }

  if (hash === "#monitoring") {
    return "monitoring";
  }

  if (hash === "#reports") {
    return "reports";
  }

  if (hash === "#about") {
    return "about";
  }

  return "home";
}

function App() {
  const [page, setPage] = useState(getPage);

  useEffect(() => {
    const handleHashChange = () => {
      setPage(getPage());

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

    window.addEventListener(
      "hashchange",
      handleHashChange
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        handleHashChange
      );
    };
  }, []);

  let pageContent;

  switch (page) {
    case "home":
      pageContent = <Home />;
      break;

    case "dashboard":
      pageContent = <Dashboard />;
      break;

    case "login":
      pageContent = <Login />;
      break;

    case "scanner":
      pageContent = <Scanner />;
      break;

    case "analytics":
      pageContent = <Analytics />;
      break;

    case "advisory":
      pageContent = <Advisory />;
      break;

    case "chatbot":
      pageContent = <Chatbot />;
      break;

    case "monitoring":
      pageContent = <Monitoring />;
      break;

    case "reports":
      pageContent = <Reports />;
      break;

    case "about":
      pageContent = <About />;
      break;

    default:
      pageContent = <Home />;
  }

  const showSidebar = page === "scanner";

  const showAgriBuddy =
    page !== "home" &&
    page !== "login";

  return (
    <>
      {showSidebar && (
        <Sidebar currentPage={page} />
      )}

      <main
        className={
          showSidebar
            ? "app-main-with-sidebar"
            : "app-main"
        }
      >
        {pageContent}
      </main>

      {showAgriBuddy && <AgriBuddy />}
    </>
  );
}

export default App;