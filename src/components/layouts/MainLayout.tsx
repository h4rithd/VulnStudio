
import { ReactNode } from 'react';
import Navbar from '../navigation/Navbar';
import AppSidebar from '../navigation/Sidebar';
import Footer from '../navigation/Footer';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-secondary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <Navbar />
          <main className="flex-1 p-4 md:p-6 overflow-auto mx-3">
            {children}
          </main>
          <Footer />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;