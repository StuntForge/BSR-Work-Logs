import { ReviewClient } from "./ReviewClient";

export default async function ApplicantReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewClient id={id} />;
}
