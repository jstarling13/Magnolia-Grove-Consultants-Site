import type { Metadata } from "next";
import Header from "@/components/global/Header";
import Footer from "@/components/global/Footer";
import { brand, contactDetails } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: "Privacy Policy | Magnolia Grove Consultants",
  description: "How Magnolia Grove Consultants collects, uses, and protects client and visitor data.",
};

// NOTE: Placeholder legal copy — have counsel review before public launch.
export default function PrivacyPage() {
  const email = contactDetails.find((detail) => detail.label === "Email")?.value;

  return (
    <>
      <Header />
      <main className="bg-onyx px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <span className="eyebrow">Legal</span>
          <h1 className="mt-3 text-3xl sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted">Last updated: {new Date().getFullYear()}</p>

          <div className="mt-10 flex flex-col gap-8 text-left text-sm leading-relaxed text-muted-light">
            <section>
              <h2 className="text-xl text-white">Information We Collect</h2>
              <p className="mt-3">
                {brand.name} collects information you voluntarily submit through our contact and
                strategy session forms — including name, organization, email, phone number, and
                any details you share about your campaign or engagement. We do not collect this
                information through any other means without your knowledge.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">How We Use Information</h2>
              <p className="mt-3">
                Submitted information is used solely to evaluate and respond to your inquiry,
                schedule consultations, and — where you have engaged us — deliver contracted
                services. We do not sell, rent, or share your information with third parties for
                marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Confidentiality</h2>
              <p className="mt-3">
                All client engagement details, campaign strategy, and submitted data are treated
                as strictly confidential and are shared internally only with team members directly
                involved in your engagement.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Data Retention & Security</h2>
              <p className="mt-3">
                We retain submitted information only as long as necessary to fulfill the purposes
                described above, and take reasonable technical and organizational measures to
                protect it against unauthorized access, alteration, or disclosure.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Your Rights</h2>
              <p className="mt-3">
                You may request access to, correction of, or deletion of your personal information
                at any time by contacting us at{" "}
                {email && (
                  <a href={`mailto:${email}`} className="text-gold-bright hover:text-white">
                    {email}
                  </a>
                )}
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Contact</h2>
              <p className="mt-3">
                Questions about this policy can be directed to {brand.name} using the contact
                details in our website footer.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
