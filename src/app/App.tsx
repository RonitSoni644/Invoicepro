import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './lib/auth-context';
import { router } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
