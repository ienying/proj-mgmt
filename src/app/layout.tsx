import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { Toaster } from 'sonner';
import { ChunkErrorHandler } from '@/components/chunk-error-handler';
import { AuthProvider } from '@/components/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '项目管理平台',
    template: '%s | 项目管理平台',
  },
  description:
    '企业级项目管理平台，支持项目全生命周期管理、团队协作、进度跟踪等功能',
  keywords: [
    '项目管理',
    'PM',
    '项目管理平台',
    '任务管理',
    '团队协作',
  ],
  authors: [{ name: 'Project Management Team' }],
  generator: 'Coze Code',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        <AuthProvider>
          <ChunkErrorHandler />
          {isDev && <Inspector />}
          {children}
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
