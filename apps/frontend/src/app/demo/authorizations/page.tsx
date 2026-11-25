import { Suspense } from "react";
import { BoardClient } from "./~lib/board-client";

export default function AuthorizationsPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <BoardClient />
    </Suspense>
  );
}
