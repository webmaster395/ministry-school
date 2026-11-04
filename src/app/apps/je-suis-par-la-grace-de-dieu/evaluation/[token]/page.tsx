import ExternalSkillReview from "@/components/apps/ExternalSkillReview";
export default async function ExternalReviewPage({ params }: { params: Promise<{ token: string }> }) { return <ExternalSkillReview token={(await params).token} />; }
