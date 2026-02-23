import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import OverviewView from "./views/OverviewView";

const NoteView = lazy(() => import("./views/NoteView"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/overview" element={<OverviewView />} />
        <Route path="/note/:id" element={<Suspense fallback={<div>Loading...</div>}><NoteView /></Suspense>} />
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
