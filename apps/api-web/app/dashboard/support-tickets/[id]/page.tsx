import { SupportTicketClient } from "./SupportTicketClient";

export default async function SupportTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupportTicketClient id={id} />;
}
