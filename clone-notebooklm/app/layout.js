import "./globals.css";

export const metadata = {
  title: "NotebookLM Clone — AI 연구 어시스턴트",
  description: "문서를 업로드하고 AI와 대화하세요. 인용 기반 답변, 요약, 팟캐스트 생성까지.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
