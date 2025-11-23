import { useEffect, useState } from "react";

type ServerState = {
  enabled: boolean;
  onHighSeverity: boolean;
  onLiquidation: boolean;
  hasToken: boolean;
  hasChatId: boolean;
};

export default function IntegrationsTelegram() {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [state, setState] = useState<ServerState>({
    enabled: false, onHighSeverity: false, onLiquidation: false, hasToken: false, hasChatId: false
  });
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");

  useEffect(() => {
    fetch("/api/integrations/telegram", { mode: "cors", headers: { "Content-Type": "application/json" } })
      .then(r => r.json())
      .then(setState)
      .catch(err => { console.warn("API Error, using fallback:", err); setState({ enabled: false, onHighSeverity: false, onLiquidation: false, hasToken: false, hasChatId: false }); });
  }, []);

  const save = async () => {
    try {
      const body: any = {
        enabled: state.enabled,
        onHighSeverity: state.onHighSeverity,
        onLiquidation: state.onLiquidation
      };
      if (token.trim()) body.token = token.trim();
      if (chatId.trim()) body.chatId = chatId.trim();
      const res = await fetch("/api/integrations/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await res.json();
      setState(j);
      setToken("");
      setChatId("");
    } catch (error: any) {
      console.error("Error saving telegram settings:", error);
      setError(error.message || "Failed to save settings");
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 12 }}>
      <h2>Telegram Integration</h2>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={state.enabled} onChange={e => setState(s => ({ ...s, enabled: e.target.checked }))} />
        Enable Telegram Alerts
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={state.onHighSeverity} onChange={e => setState(s => ({ ...s, onHighSeverity: e.target.checked }))} />
        Notify on High-Severity Signals
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={state.onLiquidation} onChange={e => setState(s => ({ ...s, onLiquidation: e.target.checked }))} />
        Notify on Liquidation Risk
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        <label>Bot Token {state.hasToken ? "• Stored" : ""}</label>
        <input dir="ltr" type="password" value={token} onChange={e => setToken(e.target.value)} />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label>Chat ID {state.hasChatId ? "• Stored" : ""}</label>
        <input dir="ltr" value={chatId} onChange={e => setChatId(e.target.value)} />
      </div>
      <button onClick={save}>Save</button>
    </div>
  );
}
