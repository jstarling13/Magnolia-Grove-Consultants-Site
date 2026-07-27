import type { Metadata } from "next";
import Header from "@/components/global/Header";
import Footer from "@/components/global/Footer";
import { brand } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: "Terms of Service | Magnolia Grove Consultants",
  description: "Terms governing engagement with Magnolia Grove Consultants.",
};

// NOTE: Placeholder legal copy — have counsel review before public launch.
export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="bg-onyx px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <span className="eyebrow">Legal</span>
          <h1 className="mt-3 text-3xl sm:text-4xl">Terms of Service</h1>
          <p className="mt-4 text-sm text-muted">Last updated: {new Date().getFullYear()}</p>

          <div className="mt-10 flex flex-col gap-8 text-left text-sm leading-relaxed text-muted-light">
            <section>
              <h2 className="text-xl text-white">Engagement Scope</h2>
              <p className="mt-3">
                These Terms govern any strategy session, proposal, or engagement initiated through{" "}
                {brand.name}&apos;s website. Submitting an inquiry does not itself create a client
                relationship — formal engagement begins only upon signed agreement between the
                client and {brand.name}.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Confidentiality</h2>
              <p className="mt-3">
                Both parties agree to treat all shared campaign strategy, financial data, voter
                data, and related materials as strictly confidential, disclosed only to personnel
                directly involved in delivering the engagement.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Client Responsibilities</h2>
              <p className="mt-3">
                Clients are responsible for the accuracy of information provided and for securing
                all necessary rights, consents, and regulatory compliance (including applicable
                campaign finance and communications law) related to their own campaign or
                organization.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Limitation of Liability</h2>
              <p className="mt-3">
                {brand.name} provides strategic, operational, and creative services on a
                best-efforts basis. Except as otherwise agreed in a signed engagement contract, we
                do not guarantee specific electoral, fundraising, or business outcomes.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Changes to These Terms</h2>
              <p className="mt-3">
                We may update these Terms from time to time. Continued use of this site after
                changes are posted constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-white">Contact</h2>
              <p className="mt-3">
                Questions about these Terms can be directed to {brand.name} using the contact
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
