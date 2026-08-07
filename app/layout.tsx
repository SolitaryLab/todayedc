import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "오늘의민원 | 오늘의 목소리를 한 번에",
  description: "날짜별 민원 제목, 내용, 처리기관을 간편하게 복사해 국민신문고에 접수하세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
