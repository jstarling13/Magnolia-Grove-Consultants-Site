import type { Metadata } from "next";
import { brand, contactDetails } from "@/config/siteConfig";
import LegalLayout, { type LegalSection as LegalSectionType } from "@/components/legal/LegalLayout";
import LegalSection from "@/components/legal/LegalSection";

export const metadata: Metadata = {
  title: "Terms of Service | Magnolia Grove Consultants",
  description: "Terms governing use of the Magnolia Grove Consultants, LLC website and services.",
};

const sections: LegalSectionType[] = [
  { id: "scope-of-service", label: "Scope of Service" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "limitation-of-liability", label: "Limitation of Liability" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  const email = contactDetails.find((detail) => detail.label === "Email")?.value;

  return (
    <LegalLayout title="Terms of Service" lastUpdated="July 27, 2026" sections={sections}>
      <LegalSection id="scope-of-service" index="01" title="Scope of Service">
        <p>
          This website and its content are provided for informational purposes and to facilitate
          consultation booking with {brand.name}, LLC (&quot;Magnolia Grove,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;). Submitting an intake form or booking a strategy
          session does not itself create a client, agency, or fiduciary relationship. Formal
          consulting services, deliverables, and any associated obligations begin only upon
          execution of a separate master services agreement (MSA) or statement of work (SOW) between
          you and Magnolia Grove.
        </p>
      </LegalSection>

      <LegalSection id="intellectual-property" index="02" title="Intellectual Property">
        <p>
          All proprietary code, process frameworks, strategic methodologies, branding assets, copy,
          and design elements appearing on this website are the exclusive property of Magnolia Grove
          Consultants, LLC and are protected under applicable intellectual property law. No license
          is granted to reproduce, distribute, modify, or create derivative works from this content
          without our express written consent.
        </p>
      </LegalSection>

      <LegalSection id="limitation-of-liability" index="03" title="Limitation of Liability">
        <p>
          This website and its content are provided &quot;as is&quot; without warranties of any
          kind, express or implied, including warranties of merchantability, fitness for a
          particular purpose, or non-infringement. Case studies, performance metrics, and past
          campaign results referenced on this site are illustrative of prior engagements only and do
          not constitute a guarantee of any future electoral, fundraising, or business outcome. To
          the fullest extent permitted by law, Magnolia Grove disclaims liability for any direct,
          indirect, incidental, or consequential damages arising from your use of this website.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" index="04" title="Acceptable Use">
        <p>You agree not to:</p>
        <ul className="flex flex-col gap-2 pl-5">
          <li className="list-disc">
            Reverse engineer, decompile, or attempt to extract the source code of this website;
          </li>
          <li className="list-disc">
            Submit fraudulent, automated, or spam entries through our intake or booking forms;
          </li>
          <li className="list-disc">
            Scrape, harvest, or systematically extract content or data from this website without our
            express written authorization; or
          </li>
          <li className="list-disc">
            Use this website in any manner that could disable, overburden, damage, or impair its
            operation.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="governing-law" index="05" title="Governing Law">
        <p>
          These Terms are governed by and construed in accordance with the laws of the State of
          Georgia, without regard to its conflict of laws principles. Any dispute arising under
          these Terms shall be subject to the exclusive jurisdiction of the state and federal courts
          located in Georgia.
        </p>
      </LegalSection>

      <LegalSection id="contact" index="06" title="Contact">
        <p>
          Questions about these Terms can be directed to{" "}
          {email && (
            <a href={`mailto:${email}`} className="text-gold-bright hover:text-white">
              {email}
            </a>
          )}
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
