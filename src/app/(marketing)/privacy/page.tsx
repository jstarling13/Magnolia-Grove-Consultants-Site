import type { Metadata } from "next";
import LegalLayout, { type LegalSection as LegalSectionType } from "@/components/legal/LegalLayout";
import LegalSection from "@/components/legal/LegalSection";

export const metadata: Metadata = {
  title: "Privacy Policy | Magnolia Grove Consultants",
  description:
    "How Magnolia Grove Consultants, LLC collects, uses, and protects client and visitor data.",
};

const sections: LegalSectionType[] = [
  { id: "information-we-collect", label: "1. Information We Collect" },
  { id: "how-we-use-information", label: "2. How We Use Information" },
  { id: "data-sharing", label: "3. Data Sharing & Third Parties" },
  { id: "data-security", label: "4. Data Security" },
  { id: "user-rights", label: "5. User Rights & Choices" },
  { id: "data-retention", label: "6. Data Retention" },
  { id: "childrens-privacy", label: "7. Children's Privacy" },
  { id: "contact-us", label: "8. Contact Us" },
  { id: "changes", label: "9. Changes to This Privacy Policy" },
  { id: "governing-law", label: "10. Governing Law & Jurisdiction" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="July 28, 2026" sections={sections}>
      <p className="text-sm text-onyx/60">Effective Date: July 28, 2026</p>

      <p className="mt-6 text-base leading-relaxed text-onyx/80 sm:text-base">
        Magnolia Grove Consultants, LLC (&quot;Magnolia Grove,&quot; &quot;we,&quot; &quot;us,&quot;
        or &quot;our&quot;) provides integrated political strategy, creative marketing, print
        production, and digital web/automation infrastructure services to political campaigns,
        political action committees (PACs), non-profit organizations, and enterprise leaders
        (collectively, &quot;Clients&quot;). This Privacy Policy explains how we collect, use,
        disclose, and safeguard information when you visit our website at magnoliagrovega.com (the
        &quot;Site&quot;), submit a booking or contact form, or otherwise engage with our services.
      </p>

      <p className="mt-4 text-base leading-relaxed text-onyx/80 sm:text-base">
        By using the Site, you agree to the terms of this Privacy Policy. If you do not agree with
        these terms, please do not use the Site.
      </p>

      <LegalSection id="information-we-collect" index="01" title="Information We Collect">
        <p>
          We collect information in two general categories: information you provide to us directly,
          and information collected automatically through your use of the Site.
        </p>

        <h3 className="mt-2 text-base font-semibold text-onyx">
          1.1 Information You Provide Directly
        </h3>
        <p>
          When you complete a booking form, contact form, discovery call request, or otherwise
          communicate with us, we may collect:
        </p>
        <ul className="flex flex-col gap-2 pl-5">
          <li className="list-disc">
            <strong className="text-onyx">Personal identifiers:</strong> full name, email address,
            phone number, and job title.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Organizational information:</strong> company, campaign,
            PAC, or non-profit name; organization type; and role within the organization.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Project and engagement details:</strong> project scope,
            service interests (political strategy, creative marketing, print production,
            web/automation infrastructure), budget ranges, timelines, and any other information you
            choose to share regarding your objectives.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Correspondence:</strong> the content of emails, messages,
            and other communications you send us, including any attachments.
          </li>
        </ul>

        <h3 className="mt-4 text-base font-semibold text-onyx">
          1.2 Information Collected Automatically
        </h3>
        <p>
          When you visit the Site, certain information is collected automatically through cookies,
          log files, and similar technologies, including:
        </p>
        <ul className="flex flex-col gap-2 pl-5">
          <li className="list-disc">
            <strong className="text-onyx">Device and usage data:</strong> IP address, browser type
            and version, operating system, referring/exit pages, pages viewed, time and date of
            visit, and time spent on pages.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Cookies and similar technologies:</strong> small data
            files stored on your device to support Site functionality, remember preferences, and
            analyze traffic patterns.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Analytics and hosting telemetry:</strong> aggregated and
            individual usage analytics collected through our hosting and analytics infrastructure
            (Vercel for hosting, and Google Analytics 4 for traffic analytics), which may include
            page load performance, geographic region (derived from IP address), and traffic source
            data.
          </li>
        </ul>
        <p>
          We do not knowingly collect sensitive personal information (such as Social Security
          numbers, financial account credentials, or health information) through the Site, and you
          should not submit such information through our forms.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use-information" index="02" title="How We Use Information">
        <p>We use the information we collect for the following purposes:</p>
        <ul className="flex flex-col gap-2 pl-5">
          <li className="list-disc">
            To schedule and conduct strategy sessions, discovery calls, and consultations with
            prospective and current Clients.
          </li>
          <li className="list-disc">
            To deliver, manage, and support our consulting, creative, print production, and digital
            infrastructure services.
          </li>
          <li className="list-disc">
            To communicate with you regarding project updates, deliverables, invoicing, scheduling,
            and account administration.
          </li>
          <li className="list-disc">
            To respond to inquiries submitted through our contact or booking forms.
          </li>
          <li className="list-disc">
            To monitor, maintain, secure, and improve the performance, usability, and functionality
            of the Site.
          </li>
          <li className="list-disc">
            To understand aggregate trends in how visitors use the Site, in order to inform business
            and marketing decisions.
          </li>
          <li className="list-disc">
            To comply with applicable legal obligations, enforce our agreements, and protect the
            rights, property, and safety of Magnolia Grove, our Clients, and others.
          </li>
        </ul>
        <p className="font-semibold text-onyx">
          We do not use information submitted through our forms to build political profiles, engage
          in political targeting of individuals, or share it with third parties for their own
          political messaging purposes.
        </p>
      </LegalSection>

      <LegalSection id="data-sharing" index="03" title="Data Sharing & Third Parties">
        <p className="font-semibold text-onyx">
          We do not sell client data. Magnolia Grove does not sell, rent, or trade personal
          information collected through the Site to third parties for their own marketing or
          commercial purposes.
        </p>
        <p>
          We may share information with the following categories of trusted third parties, solely as
          necessary to operate our business and deliver services to you:
        </p>
        <ul className="flex flex-col gap-2 pl-5">
          <li className="list-disc">
            <strong className="text-onyx">Hosting and infrastructure providers</strong> (Vercel),
            which host the Site, process web traffic, and provide performance/analytics telemetry.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Transactional email delivery</strong> (Resend), used to
            deliver contact and booking form notifications and confirmations.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Bot detection and spam prevention</strong> (Cloudflare
            Turnstile), used to protect our forms from automated abuse.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Email and productivity/communication tools</strong> (e.g.,
            Google Workspace), which we use to send and receive correspondence, manage calendars,
            and store project-related documentation.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">
              Scheduling, project management, and payment processing tools
            </strong>{" "}
            (including Square for invoice payments) used to coordinate strategy sessions and
            administer client engagements.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Professional advisors</strong>, including legal,
            accounting, and compliance consultants, where necessary to operate our business or
            comply with applicable law.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Successors in interest</strong>, in the event of a merger,
            acquisition, financing, or sale of all or a portion of our business assets, subject to
            standard confidentiality protections.
          </li>
        </ul>
        <p>
          These third parties are authorized to use your information only as necessary to provide
          the applicable service to us and are contractually or otherwise obligated to maintain
          appropriate confidentiality and security standards.
        </p>
        <p>
          We may also disclose information where required to do so by law, subpoena, or other legal
          process, or where we believe in good faith that disclosure is necessary to protect our
          rights, the safety of any person, or to investigate fraud or security issues.
        </p>
      </LegalSection>

      <LegalSection id="data-security" index="04" title="Data Security">
        <p>
          Given the sensitive nature of political campaign and client engagement data, Magnolia
          Grove implements administrative, technical, and physical safeguards designed to protect
          information from unauthorized access, use, disclosure, alteration, or destruction. These
          safeguards include, among others:
        </p>
        <ul className="flex flex-col gap-2 pl-5">
          <li className="list-disc">
            <strong className="text-onyx">Administrative safeguards:</strong> internal access
            controls limiting data access to personnel who need it to perform their job functions,
            confidentiality obligations for staff and contractors, and periodic review of
            data-handling practices.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Technical safeguards:</strong> encrypted data transmission
            (HTTPS/TLS), secure hosting infrastructure, access-controlled email and file storage
            systems, and routine monitoring for suspicious activity.
          </li>
          <li className="list-disc">
            <strong className="text-onyx">Physical safeguards:</strong> restricted access to devices
            and systems used to store or process client information.
          </li>
        </ul>
        <p>
          While we take reasonable steps to protect your information, no method of transmission over
          the internet or method of electronic storage is completely secure. We cannot guarantee
          absolute security, and you provide information to us at your own risk.
        </p>
      </LegalSection>

      <LegalSection id="user-rights" index="05" title="User Rights & Choices">
        <h3 className="text-base font-semibold text-onyx">5.1 Marketing Communications</h3>
        <p>
          If you receive marketing or promotional communications from us, you may opt out at any
          time by:
        </p>
        <ul className="flex flex-col gap-2 pl-5">
          <li className="list-disc">
            Clicking the &quot;unsubscribe&quot; link included in any marketing email; or
          </li>
          <li className="list-disc">
            Contacting us directly at the email address listed in Section 8 below.
          </li>
        </ul>
        <p>
          Please note that even if you opt out of marketing communications, we may still send you
          transactional or administrative communications related to an active engagement (e.g.,
          project updates, invoices, or scheduling confirmations).
        </p>

        <h3 className="mt-4 text-base font-semibold text-onyx">
          5.2 Access, Correction, and Deletion Requests
        </h3>
        <p>You may request to:</p>
        <ul className="flex flex-col gap-2 pl-5">
          <li className="list-disc">Access the personal information we hold about you;</li>
          <li className="list-disc">Correct or update inaccurate or incomplete information; or</li>
          <li className="list-disc">
            Request deletion of your personal information, subject to certain exceptions (such as
            information we are required to retain for legal, contractual, accounting, or legitimate
            business purposes).
          </li>
        </ul>
        <p>
          To submit such a request, please contact us using the information in Section 8. We will
          respond to verified requests within a reasonable timeframe consistent with applicable law.
        </p>

        <h3 className="mt-4 text-base font-semibold text-onyx">5.3 Cookie Choices</h3>
        <p>
          Most browsers allow you to control cookies through their settings, including blocking or
          deleting cookies. Please note that disabling cookies may affect the functionality of
          certain features on the Site.
        </p>

        <h3 className="mt-4 text-base font-semibold text-onyx">5.4 Do Not Track</h3>
        <p>The Site does not currently respond to &quot;Do Not Track&quot; browser signals.</p>
      </LegalSection>

      <LegalSection id="data-retention" index="06" title="Data Retention">
        <p>
          We retain personal information for as long as necessary to fulfill the purposes described
          in this Privacy Policy, including to deliver services, maintain business records, comply
          with legal and contractual obligations, resolve disputes, and enforce our agreements.
          Retention periods vary depending on the nature of the information and the context in which
          it was collected.
        </p>
      </LegalSection>

      <LegalSection id="childrens-privacy" index="07" title="Children's Privacy">
        <p>
          The Site and our services are intended for business and professional use and are not
          directed to individuals under the age of 18. We do not knowingly collect personal
          information from children. If we become aware that we have inadvertently collected
          information from a child under 18, we will take reasonable steps to delete it.
        </p>
      </LegalSection>

      <LegalSection id="contact-us" index="08" title="Contact Us">
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or our data
          practices, please contact us at:
        </p>
        <p>
          <strong className="text-onyx">Magnolia Grove Consultants</strong>
          <br />
          Email:{" "}
          <a href="mailto:ben@magnoliagrovega.com" className="text-gold-dark hover:text-onyx">
            ben@magnoliagrovega.com
          </a>
          <br />
          Website:{" "}
          <a
            href="https://magnoliagrovega.com"
            className="text-gold-dark hover:text-onyx"
            target="_blank"
            rel="noopener noreferrer"
          >
            magnoliagrovega.com
          </a>
        </p>
      </LegalSection>

      <LegalSection id="changes" index="09" title="Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices,
          technologies, legal requirements, or other factors. We will post the revised Privacy
          Policy on this page with an updated &quot;Last Updated&quot; date. Your continued use of
          the Site following any changes constitutes your acceptance of the revised Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" index="10" title="Governing Law & Jurisdiction">
        <p>
          Magnolia Grove Consultants operates from the State of Georgia, United States. This Privacy
          Policy, and any dispute arising out of or related to it or your use of the Site, shall be
          governed by and construed in accordance with the laws of the State of Georgia, without
          regard to its conflict-of-laws principles. You agree that any legal action or proceeding
          relating to this Privacy Policy shall be brought exclusively in the state or federal
          courts located in Georgia, and you consent to the personal jurisdiction of such courts.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
