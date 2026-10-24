import { Suspense } from "react";
import { NewRequestClient } from "./~lib/new-request-client";

export default function NewAuthorizationPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <NewRequestClient />
    </Suspense>
  );
}
