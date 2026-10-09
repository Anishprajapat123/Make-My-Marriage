import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findCurrentMembershipForUser } from "@/modules/members/membership.service";
import { WeddingOnboardingScreen } from "@/modules/wedding/components/wedding-onboarding-screen";

export const metadata: Metadata = {
  title: "Create your wedding workspace | Make My Marriage",
};

export default async function WeddingOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await findCurrentMembershipForUser(session.user.id);
  if (membership?.membershipStatus === "ACTIVE") {
    redirect("/dashboard");
  }

  return (
    <WeddingOnboardingScreen
      accessPaused={membership?.membershipStatus === "SUSPENDED"}
    />
  );
}
