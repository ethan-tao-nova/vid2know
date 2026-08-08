import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeContext";
import { LocaleProvider } from "./i18n/LocaleContext";
import { HomeDraftProvider } from "./state/HomeDraftContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <HomeDraftProvider>
          <App />
        </HomeDraftProvider>
      </LocaleProvider>
    </ThemeProvider>
  </React.StrictMode>
);
