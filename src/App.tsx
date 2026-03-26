import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { Dashboard } from "./pages/Dashboard";
import { UploadMeetingAudio } from "./pages/UploadMeetingAudio";
import { MeetingMinutes } from "./pages/MeetingMinutes";
import { TaskApproval } from "./pages/TaskApproval";
import { FacultyTasks } from "./pages/FacultyTasks";
import { Notifications } from "./pages/Notifications";
import { CalendarPage } from "./pages/CalendarPage";
import { Profile } from "./pages/Profile";
import { TaskDetails } from "./pages/TaskDetails";
import { LoginPage } from "./pages/LoginPage";
import { TaskProvider } from "./context/TaskContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleGuard } from "./components/auth/RoleGuard";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <TaskProvider>
          <RootLayout />
        </TaskProvider>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <RoleGuard allowedRoles={["admin", "hod"]}>
            <Dashboard />
          </RoleGuard>
        ),
      },
      {
        path: "upload-audio",
        element: (
          <RoleGuard allowedRoles={["hod"]}>
            <UploadMeetingAudio />
          </RoleGuard>
        ),
      },
      {
        path: "meeting-minutes",
        element: (
          <RoleGuard allowedRoles={["admin", "hod"]}>
            <MeetingMinutes />
          </RoleGuard>
        ),
      },
      {
        path: "task-approval",
        element: (
          <RoleGuard allowedRoles={["hod"]}>
            <TaskApproval />
          </RoleGuard>
        ),
      },
      {
        path: "faculty-tasks",
        element: <FacultyTasks />,
      },
      {
        path: "tasks/:taskId",
        element: <TaskDetails />,
      },
      {
        path: "notifications",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <Notifications />
          </RoleGuard>
        ),
      },
      {
        path: "calendar",
        element: <CalendarPage />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
    ],
  },
]);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
