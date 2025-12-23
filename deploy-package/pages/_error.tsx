import type { NextPageContext } from "next";

interface ErrorProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc", color: "#0f172a", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: 700, marginBottom: "1rem" }}>
        {statusCode ? `${statusCode} Error` : "예기치 않은 오류가 발생했습니다"}
      </h1>
      <p style={{ fontSize: "1.1rem", maxWidth: "32rem", lineHeight: 1.6 }}>
        문제가 지속되면 관리자에게 문의하거나 잠시 후 다시 시도해 주세요.
      </p>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default ErrorPage;
