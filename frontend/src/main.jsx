import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { StudySessionProvider } from "./context/StudySessionContext.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import ParentDashboard from "./pages/ParentDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminLeaderboardPage from "./pages/AdminLeaderboardPage.jsx";
import AdminQuestionBankPage from "./pages/AdminQuestionBankPage.jsx";
import AdminMockTestCreator from "./pages/AdminMockTestCreator.jsx";
import PDFUploadManager from "./pages/PDFUploadManager.jsx";
import ChaptersPage from "./pages/ChaptersPage.jsx";
import ChapterDetailPage from "./pages/ChapterDetailPage.jsx";
import DoubtSolverPage from "./pages/DoubtSolverPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import PdfViewerPage from "./pages/PdfViewerPage.jsx";
import ModuleLearningPage from "./pages/ModuleLearningPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <StudySessionProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/student" element={<ProtectedRoute roles={["student"]}><StudentDashboard /></ProtectedRoute>} />
                <Route path="/parent" element={<ProtectedRoute roles={["parent"]}><ParentDashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/leaderboard" element={<ProtectedRoute roles={["admin"]}><AdminLeaderboardPage /></ProtectedRoute>} />
                <Route path="/admin/questions" element={<ProtectedRoute roles={["admin"]}><AdminQuestionBankPage /></ProtectedRoute>} />
                <Route path="/admin/mock-tests" element={<ProtectedRoute roles={["admin"]}><AdminMockTestCreator /></ProtectedRoute>} />
                <Route path="/admin/pdf-manager" element={<ProtectedRoute roles={["admin"]}><PDFUploadManager /></ProtectedRoute>} />
                <Route path="/chapters" element={<ChaptersPage />} />
                <Route path="/chapters/:chapterId" element={<ChapterDetailPage />} />
                <Route path="/viewer/:subject/:slug" element={<PdfViewerPage />} />
                <Route path="/study/:subject/:slug" element={<ModuleLearningPage />} />
                <Route path="/doubts" element={<DoubtSolverPage />} />
                <Route path="/quiz" element={<QuizPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </StudySessionProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
