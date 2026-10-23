import { useParams } from "react-router-dom";
import { PayersLandingPage } from "./PayersLandingPage";
import { PayerWorkspace } from "./PayerWorkspace";

/** Payers: /payers is the landing page (every payer, search and filters); /payers/:id is that payer's workspace with four views. */
export default function PayersPage() {
  const { id } = useParams();
  return id ? <PayerWorkspace key={id} id={id} /> : <PayersLandingPage />;
}
