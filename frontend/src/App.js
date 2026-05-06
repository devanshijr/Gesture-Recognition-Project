import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#121212",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#F8F9FA",
            borderRadius: 0,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
          },
        }}
      />
    </div>
  );
}

export default App;
