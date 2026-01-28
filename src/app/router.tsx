import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { Student } from '../pages/Student';
import { Teacher } from '../pages/Teacher';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />, 
    children: [
      { index: true, element: <Navigate to="/student" replace /> },
      { path: 'student', element: <Student /> },
      { path: 'teacher', element: <Teacher /> },
    ],
  },
]);
