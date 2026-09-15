import type { Metadata } from "next";
import LegalLayout, { type LegalSection as LegalSectionType } from "@/components/legal/LegalLayout";
import LegalSection from "@/components/legal/LegalSection";

export const metadata: Metadata = {
  title: "Terms of Service | Magnolia Grove Consultants",
  description: "Terms governing engagement with Magnolia Grove Consultants, LLC.",
};

const sections: LegalSectionType[] = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "scope-of-services", label: "2. Scope of Services" },
  { id: "intellectual-property", label: "3. Intellectual Property Rights" },
  { id: "payment-terms", label: "4. Payment Terms & Invoicing" },
  { id: "liability", label: "5. Limitation of Liability & Disclaimers" },
  { id: "confidentiality", label: "6. Confidentiality" },
  { id: "termination", label: "7. Termination" },
  { id: "governing-law", label: "8. Governing Law; Dispute Resolution" },
  { id: "general-provisions", label: "9. General Provisions" },
];

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="July 28, 2026" sections={sections}>
      <p className="text-sm text-onyx/60">Effective Date: July 28, 2026</p>

      <p className="mt-6 text-sm leading-relaxed text-onyx/80 sm:text-base">
        These Terms of Service, together with any applicable Statement of Work, Master Services
        Agreement, invoice, or order form (collectively, this &quot;
        <strong className="text-onyx">Agreement</strong>&quot;), constitute a legally binding
        agreement between <strong className="text-onyx">Magnolia Grove Consultants, LLC</strong>, a
        Georgia limited liability company with a principal place of business in Columbus, Georgia
        (&quot;
        <strong className="text-onyx">Magnolia Grove</strong>,&quot; &quot;
        <strong className="text-onyx">the Agency</strong>,&quot; &quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;), and the individual, organization, campaign committee, political action
        committee, corporation, or other entity engaging Magnolia Grove&apos;s services or accessing
        magnoliagrovega.com (the &quot;<strong className="text-onyx">Site</strong>
        &quot;) (&quot;<strong className="text-onyx">Client</strong>,&quot; &quot;you,&quot; or
        &quot;your&quot;). Magnolia Grove and Client may each be referred to individually as a
        &quot;Party&quot; and collectively as the &quot;Parties.&quot;
      </p>

      <p className="mt-4 text-sm font-semibold text-onyx sm:text-base">
        Please read this agreement carefully. It contains important disclaimers, limitations of
        liability, confidentiality obligations, and other provisions that affect your legal rights.
      </p>

      <LegalSection id="acceptance" index="01" title="Acceptance of Terms">
        <p>
          <strong className="text-onyx">1.1 Binding Effect.</strong> By (a) accessing or using the
          Site, (b) executing a Statement of Work (&quot;SOW&quot;), proposal, order form, or
          engagement letter referencing this Agreement, (c) submitting payment for any invoice
          issued by Magnolia Grove, or (d) otherwise engaging, instructing, or authorizing Magnolia
          Grove to perform services, Client acknowledges that it has read, understood, and agrees to
          be bound by this Agreement in its entirety. If Client does not agree to these terms,
          Client must immediately discontinue use of the Site and must not engage Magnolia
          Grove&apos;s services.
        </p>
        <p>
          <strong className="text-onyx">1.2 Authority.</strong> Any individual accepting this
          Agreement on behalf of an organization, campaign, committee, or other entity represents
          and warrants that they have the legal authority to bind that entity to this Agreement.
        </p>
        <p>
          <strong className="text-onyx">1.3 Modifications.</strong> Magnolia Grove reserves the
          right to update or modify this Agreement at any time by posting a revised version on the
          Site or by delivering notice to Client&apos;s designated contact. Continued use of the
          Site or continued engagement of services following such notice constitutes acceptance of
          the revised Agreement. Material changes affecting an active SOW will not apply
          retroactively to that SOW unless mutually agreed in writing.
        </p>
        <p>
          <strong className="text-onyx">1.4 Eligibility.</strong> Client represents that it has full
          legal capacity and authority to enter into this Agreement and, where applicable, is duly
          organized and in good standing under the laws of its jurisdiction of formation, including
          compliance with any applicable campaign finance, lobbying disclosure, or political
          committee registration requirements.
        </p>
      </LegalSection>

      <LegalSection id="scope-of-services" index="02" title="Scope of Services">
        <p>
          <strong className="text-onyx">2.1 Governing Documents.</strong> Magnolia Grove provides
          strategic advisory, political and public affairs consulting, digital marketing, print
          production, and web/software development and automation infrastructure services
          (collectively, the &quot;Services&quot;). The specific Services to be performed,
          associated deliverables, timelines, fees, and any special terms for a given engagement
          shall be set forth in an individually executed SOW, proposal, or invoice (each, a
          &quot;SOW&quot;). This Agreement governs all Services generally; in the event of a direct
          conflict between this Agreement and a specific SOW, the SOW controls solely with respect
          to the subject matter expressly addressed therein.
        </p>
        <p>
          <strong className="text-onyx">2.2 No Implied Services.</strong> No Services are owed to
          Client, and no deliverable is guaranteed, except as expressly described in a fully
          executed SOW or accepted invoice. Verbal discussions, draft proposals, pitch materials,
          and informal correspondence do not constitute a binding commitment to perform work.
        </p>
        <p>
          <strong className="text-onyx">2.3 Client Cooperation.</strong> Client agrees to provide
          timely access to information, personnel, brand assets, credentials, approvals, and
          feedback reasonably necessary for Magnolia Grove to perform the Services. Delays caused by
          Client&apos;s failure to provide such cooperation may extend delivery timelines and will
          not constitute a breach by Magnolia Grove.
        </p>
        <p>
          <strong className="text-onyx">2.4 Third-Party Services and Platforms.</strong> Certain
          Services may involve the use of third-party platforms, vendors, media outlets, hosting
          providers, advertising networks, or software (collectively, &quot;Third-Party
          Platforms&quot;). Magnolia Grove&apos;s role with respect to Third-Party Platforms is
          limited to strategic use, configuration, and management on Client&apos;s behalf; Magnolia
          Grove does not own, control, or guarantee the performance, availability, pricing, or
          policies of any Third-Party Platform.
        </p>
        <p>
          <strong className="text-onyx">2.5 Change Orders.</strong> Any material change to the scope
          of an active SOW (including added deliverables, expanded scope, expedited timelines, or
          additional revision rounds beyond those specified) must be documented in a written change
          order or amended SOW signed by both Parties and may result in additional fees.
        </p>
      </LegalSection>

      <LegalSection id="intellectual-property" index="03" title="Intellectual Property Rights">
        <p>
          <strong className="text-onyx">3.1 Agency IP.</strong> Magnolia Grove retains sole and
          exclusive ownership of all right, title, and interest in and to: (a) its pre-existing
          methodologies, frameworks, playbooks, and strategic models; (b) proprietary software,
          source code libraries, automation scripts, templates, design systems, and reusable
          components not created specifically and exclusively for Client under a SOW; (c) general
          knowledge, skills, and experience developed or used in performing the Services; and (d)
          any improvements, modifications, or derivative works of the foregoing (collectively,
          &quot;Agency IP&quot;). Nothing in this Agreement transfers ownership of Agency IP to
          Client. Where Agency IP is incorporated into a Client deliverable, Magnolia Grove grants
          Client a non-exclusive, non-transferable, royalty-free license to use such incorporated
          Agency IP solely as embedded in the delivered work product, for Client&apos;s internal
          business purposes.
        </p>
        <p>
          <strong className="text-onyx">3.2 Client Deliverables.</strong> Subject to Section 3.3
          (Conditions Precedent to Transfer) and Section 4 (Payment Terms), all final,
          custom-created deliverables specifically produced for Client under a SOW — including
          finalized campaign strategy documents, custom marketing and campaign copy, custom-designed
          print collateral, custom graphic designs, and custom-built websites, applications, or
          automation systems (excluding all Agency IP embedded therein and all Third-Party Platform
          components) — shall become the property of Client (collectively, &quot;Client
          Deliverables&quot;).
        </p>
        <p>
          <strong className="text-onyx">3.3 Conditions Precedent to Transfer.</strong>{" "}
          Notwithstanding Section 3.2, ownership of, and all rights in, Client Deliverables shall
          remain vested in Magnolia Grove and shall not transfer to Client until Magnolia Grove has
          received <strong className="text-onyx">payment in full</strong> of all amounts due for the
          applicable SOW or invoice, including any late fees. Prior to full payment, Client is
          granted a limited, revocable, non-exclusive license to review draft materials solely for
          internal evaluation purposes, and may not publish, distribute, deploy, print, broadcast,
          or otherwise use any draft or unpaid deliverable. Upon full payment, the transfer of
          ownership described in Section 3.2 shall be deemed effective automatically, without need
          for further documentation, although Magnolia Grove will execute reasonable additional
          instruments to confirm such transfer upon Client&apos;s written request and at
          Client&apos;s expense.
        </p>
        <p>
          <strong className="text-onyx">3.4 Client-Provided Materials.</strong> Client retains all
          ownership of pre-existing Client materials, trademarks, logos, data, voter files, donor
          lists, and content provided to Magnolia Grove (&quot;Client Materials&quot;). Client
          grants Magnolia Grove a limited, non-exclusive license to use Client Materials solely as
          necessary to perform the Services.
        </p>
        <p>
          <strong className="text-onyx">3.5 Portfolio Rights.</strong> Unless otherwise agreed in
          writing (including where confidentiality or political sensitivity requires otherwise under
          Section 6), Magnolia Grove may display non-confidential, publicly released deliverables in
          its portfolio, case studies, and marketing materials after such deliverables have been
          publicly released by Client.
        </p>
        <p>
          <strong className="text-onyx">3.6 Feedback.</strong> Any suggestions, ideas, or feedback
          Client provides regarding Magnolia Grove&apos;s tools, processes, or methodologies may be
          used by Magnolia Grove without restriction or compensation to Client.
        </p>
      </LegalSection>

      <LegalSection id="payment-terms" index="04" title="Payment Terms & Invoicing">
        <p>
          <strong className="text-onyx">4.1 Fees.</strong> Fees for Services shall be set forth in
          the applicable SOW and may take the form of a fixed project fee, monthly or periodic
          retainer, milestone-based payments, hourly rate, media/production budget, or a combination
          thereof.
        </p>
        <p>
          <strong className="text-onyx">4.2 Retainers.</strong> Retainer fees are due in advance of
          the period to which they apply (e.g., in advance of each calendar month) and are earned
          upon receipt for the availability of Magnolia Grove&apos;s personnel and resources during
          that period, regardless of the volume of work requested by Client during such period,
          except as otherwise expressly stated in the SOW.
        </p>
        <p>
          <strong className="text-onyx">4.3 Milestone Payments.</strong> Where a SOW specifies
          milestone-based billing, each milestone payment is due upon completion (or, where
          specified, upon commencement) of the associated phase of work, irrespective of whether
          Client has completed its own internal review or approval process, provided Magnolia Grove
          has performed the corresponding Services in good faith and in accordance with the SOW.
        </p>
        <p>
          <strong className="text-onyx">4.4 Invoicing and Due Dates.</strong> Unless otherwise
          specified in a SOW, invoices are due within{" "}
          <strong className="text-onyx">fifteen (15) days</strong> of the invoice date (&quot;Net
          15&quot;). Client is responsible for promptly notifying Magnolia Grove in writing of any
          good-faith dispute regarding an invoice within seven (7) days of receipt; undisputed
          amounts remain due per the original terms.
        </p>
        <p>
          <strong className="text-onyx">4.5 Late Fees.</strong> Any invoice not paid in full by its
          due date shall accrue a late fee equal to the lesser of{" "}
          <strong className="text-onyx">one and one-half percent (1.5%) per month</strong> or the
          maximum rate permitted under applicable law, calculated from the due date until paid in
          full. Magnolia Grove may suspend Services, withhold delivery of work product, and/or
          terminate this Agreement or the applicable SOW for accounts more than{" "}
          <strong className="text-onyx">thirty (30) days</strong> past due, without liability for
          any resulting delay or non-performance.
        </p>
        <p>
          <strong className="text-onyx">4.6 Non-Refundable Deposits.</strong> Deposits collected for
          print production, media buys, third-party production costs, advertising spend, event
          costs, or other costs committed to third-party vendors on Client&apos;s behalf are{" "}
          <strong className="text-onyx">non-refundable</strong> once Magnolia Grove has placed the
          corresponding order, committed the spend, or begun production, regardless of whether
          Client subsequently cancels, postpones, or modifies the underlying project. Client is
          responsible for all costs actually incurred or contractually committed by Magnolia Grove
          on Client&apos;s behalf prior to any notice of cancellation.
        </p>
        <p>
          <strong className="text-onyx">4.7 Expenses.</strong> Client shall reimburse Magnolia Grove
          for pre-approved, reasonable out-of-pocket expenses (including but not limited to media
          placement costs, printing costs, third-party licensing fees, travel, and software/tooling
          costs procured specifically for Client&apos;s engagement) in addition to professional
          fees, unless otherwise stated in the SOW.
        </p>
        <p>
          <strong className="text-onyx">4.8 Taxes.</strong> All fees are exclusive of applicable
          sales, use, excise, or similar taxes, which shall be Client&apos;s responsibility,
          excluding taxes based on Magnolia Grove&apos;s net income.
        </p>
        <p>
          <strong className="text-onyx">4.9 Collections.</strong> Client shall be responsible for
          all reasonable costs of collection, including attorneys&apos; fees and court costs,
          incurred by Magnolia Grove in collecting past-due amounts.
        </p>
      </LegalSection>

      <LegalSection id="liability" index="05" title="Limitation of Liability & Disclaimers">
        <p className="font-semibold text-onyx">
          5.1 No Warranty of Outcomes. Magnolia Grove provides strategic, creative, marketing, and
          technical services on a professional best-efforts basis. Client acknowledges and agrees
          that Magnolia Grove makes no warranty, guarantee, or representation, express or implied,
          regarding: (a) the outcome of any political campaign, election, ballot measure,
          legislative effort, or public affairs initiative; (b) voter, donor, or public response to
          any strategy, message, or creative asset; (c) polling results, fundraising totals, or
          media coverage; or (d) business results, revenue, lead generation, or return on investment
          from any marketing, advertising, or digital campaign.
        </p>
        <p>
          <strong className="text-onyx">5.2 Third-Party Platform Disclaimer.</strong> Magnolia Grove
          is not responsible for, and disclaims all liability arising from: (a) changes to
          algorithms, policies, advertising rules, or features of any social media, search, or
          advertising platform; (b) suspension, deactivation, shadow-banning, demonetization, or
          removal of content or accounts by any Third-Party Platform; (c) outages, downtime,
          security incidents, or performance issues of any third-party hosting provider, domain
          registrar, CDN, or SaaS platform; or (d) any change in law, regulation, or platform policy
          governing political advertising or content moderation. Client acknowledges that such
          platforms are operated by unaffiliated third parties outside Magnolia Grove&apos;s
          control.
        </p>
        <p>
          <strong className="text-onyx">5.3 Compliance is Client&apos;s Responsibility.</strong>{" "}
          Client is solely responsible for ensuring that all campaigns, communications,
          advertisements, and disclosures comply with applicable federal, state, and local election
          law, campaign finance law, lobbying disclosure requirements, FEC and equivalent state
          agency regulations, and platform-specific political advertising policies, including any
          required disclaimers (&quot;paid for by&quot;) and reporting obligations. Magnolia Grove
          is not a law firm or compliance attorney, does not provide legal advice, and Client should
          consult qualified election law counsel regarding compliance matters.
        </p>
        <p className="font-semibold text-onyx">
          5.4 Disclaimer of Warranties. Except as expressly set forth in a SOW, the Services and all
          deliverables are provided &quot;as is&quot; and &quot;as available,&quot; without
          warranties of any kind, whether express, implied, or statutory, including without
          limitation implied warranties of merchantability, fitness for a particular purpose,
          non-infringement, or any warranty arising from course of dealing or trade usage.
        </p>
        <p className="font-semibold text-onyx">
          5.5 Limitation of Liability. To the maximum extent permitted by law, in no event shall
          Magnolia Grove, its owners, officers, employees, contractors, or agents be liable for any
          indirect, incidental, special, consequential, exemplary, or punitive damages, or any loss
          of profits, revenue, data, goodwill, donations, votes, or business opportunity, arising
          out of or relating to this Agreement or the Services, regardless of the theory of
          liability (contract, tort, negligence, strict liability, or otherwise) and even if
          Magnolia Grove has been advised of the possibility of such damages. Magnolia Grove&apos;s
          total aggregate liability arising out of or related to this Agreement, whether in
          contract, tort, or otherwise, shall not exceed the total fees actually paid by Client to
          Magnolia Grove under the applicable SOW during the{" "}
          <strong className="text-onyx">six (6) months</strong> immediately preceding the event
          giving rise to the claim.
        </p>
        <p>
          <strong className="text-onyx">5.6 Indemnification.</strong> Client shall indemnify,
          defend, and hold harmless Magnolia Grove and its owners, officers, employees, and
          contractors from and against any third-party claims, damages, liabilities, costs, and
          expenses (including reasonable attorneys&apos; fees) arising out of or relating to: (a)
          Client Materials or Client-directed content, including any claim of defamation, invasion
          of privacy, or violation of election or advertising law; (b) Client&apos;s use of the
          Services or Deliverables in violation of applicable law; or (c) Client&apos;s breach of
          this Agreement. Magnolia Grove shall indemnify Client against third-party claims that a
          Client Deliverable, as delivered and used in accordance with this Agreement (excluding
          Client Materials, Client-directed changes, and Third-Party Platform components), directly
          infringes a third party&apos;s U.S. intellectual property rights, subject to the
          limitation of liability in Section 5.5.
        </p>
        <p>
          <strong className="text-onyx">5.7 Force Majeure.</strong> Neither Party shall be liable
          for delay or failure to perform resulting from causes beyond its reasonable control,
          including acts of God, natural disaster, pandemic, government action, election law changes
          enacted after SOW execution, internet or hosting outages, or platform policy changes.
        </p>
      </LegalSection>

      <LegalSection id="confidentiality" index="06" title="Confidentiality">
        <p>
          <strong className="text-onyx">6.1 Definition.</strong> &quot;Confidential
          Information&quot; means any non-public information disclosed by either Party to the other,
          whether orally, in writing, or by access to systems or documents, that is designated as
          confidential or that a reasonable person would understand to be confidential given the
          nature of the information and circumstances of disclosure, including without limitation:
          political strategy, messaging research, polling and survey data, campaign plans and
          timelines, opposition research, donor and voter lists, fundraising data, client lists,
          pricing, financial information, business metrics, source code, and proprietary
          methodologies.
        </p>
        <p>
          <strong className="text-onyx">6.2 Mutual Obligations.</strong> Each Party agrees to: (a)
          use the other Party&apos;s Confidential Information solely for purposes of performing or
          receiving the Services under this Agreement; (b) protect such information using at least
          the same degree of care it uses to protect its own confidential information, and no less
          than a reasonable degree of care; and (c) not disclose such information to any third party
          without the disclosing Party&apos;s prior written consent, except to employees,
          contractors, and advisors with a legitimate need to know who are bound by confidentiality
          obligations at least as protective as those herein.
        </p>
        <p>
          <strong className="text-onyx">6.3 Exceptions.</strong> Confidential Information does not
          include information that: (a) is or becomes publicly available through no fault of the
          receiving Party; (b) was rightfully known to the receiving Party prior to disclosure; (c)
          is independently developed without use of the disclosing Party&apos;s Confidential
          Information; or (d) is rightfully obtained from a third party without restriction.
        </p>
        <p>
          <strong className="text-onyx">6.4 Compelled Disclosure.</strong> If a Party is required by
          law, subpoena, or court order to disclose the other Party&apos;s Confidential Information,
          it shall, to the extent legally permitted, provide prompt written notice to allow the
          disclosing Party to seek a protective order.
        </p>
        <p>
          <strong className="text-onyx">6.5 Political Sensitivity.</strong> Given the sensitive
          nature of political and campaign engagements, Magnolia Grove agrees not to disclose the
          existence or details of a political consulting engagement, or any campaign strategy,
          polling, or opposition research developed for Client, to any other client, prospective
          client, media outlet, or third party without Client&apos;s prior written consent, except
          as required by applicable disclosure law.
        </p>
        <p>
          <strong className="text-onyx">6.6 Survival.</strong> The obligations of this Section 6
          shall survive termination or expiration of this Agreement for a period of{" "}
          <strong className="text-onyx">five (5) years</strong>, except with respect to trade
          secrets, which shall be protected for so long as they remain trade secrets under
          applicable law.
        </p>
        <p>
          <strong className="text-onyx">6.7 Injunctive Relief.</strong> Each Party acknowledges that
          unauthorized disclosure of Confidential Information may cause irreparable harm for which
          monetary damages would be inadequate, and the non-breaching Party shall be entitled to
          seek injunctive relief in addition to any other available remedies.
        </p>
      </LegalSection>

      <LegalSection id="termination" index="07" title="Termination">
        <p>
          <strong className="text-onyx">7.1 Termination for Convenience.</strong> Either Party may
          terminate an ongoing SOW or this Agreement for convenience upon{" "}
          <strong className="text-onyx">thirty (30) days&apos;</strong> prior written notice to the
          other Party, unless a different notice period is specified in the applicable SOW.
        </p>
        <p>
          <strong className="text-onyx">7.2 Termination for Cause.</strong> Either Party may
          terminate this Agreement or an applicable SOW immediately upon written notice if the other
          Party: (a) materially breaches this Agreement and fails to cure such breach within{" "}
          <strong className="text-onyx">fifteen (15) days</strong> of written notice describing the
          breach; (b) becomes insolvent, makes an assignment for the benefit of creditors, or
          becomes subject to bankruptcy proceedings; or (c) engages in conduct that is illegal,
          fraudulent, or that exposes the other Party to material reputational or legal risk.
        </p>
        <p>
          <strong className="text-onyx">7.3 Immediate Suspension.</strong> Magnolia Grove may
          suspend Services immediately, without liability, in the event of: (a) non-payment beyond
          the cure period set forth in Section 4.5; (b) a request by Client to engage in unlawful or
          unethical conduct; or (c) a reasonable good-faith determination that continuing the
          engagement would violate applicable law or create material legal exposure for Magnolia
          Grove.
        </p>
        <p>
          <strong className="text-onyx">7.4 Effect of Termination.</strong> Upon termination or
          expiration of a SOW: (a) Client shall pay Magnolia Grove for all Services performed and
          expenses incurred (or contractually committed, per Section 4.6) through the effective date
          of termination; (b) each Party shall return or destroy the other Party&apos;s Confidential
          Information upon request, except as required for legal or archival compliance purposes;
          (c) Sections 3 (as to paid deliverables), 4, 5, 6, 7.4, 8, and any other provision that by
          its nature should survive, shall survive termination; and (d) Magnolia Grove shall have no
          obligation to deliver, transfer, or release any work product for which payment in full has
          not been received.
        </p>
        <p>
          <strong className="text-onyx">7.5 Wind-Down.</strong> Upon termination, Magnolia Grove
          will provide reasonable cooperation, at Client&apos;s expense (at Magnolia Grove&apos;s
          then-current rates), to transition ongoing work, provided all outstanding invoices have
          been paid in full.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" index="08" title="Governing Law; Dispute Resolution">
        <p>
          <strong className="text-onyx">8.1 Governing Law.</strong> This Agreement and any dispute
          arising out of or relating to it shall be governed by and construed in accordance with the
          laws of the <strong className="text-onyx">State of Georgia</strong>, without regard to its
          conflict-of-laws principles.
        </p>
        <p>
          <strong className="text-onyx">8.2 Venue.</strong> The Parties agree that any action or
          proceeding arising out of or relating to this Agreement shall be brought exclusively in
          the state or federal courts located in Muscogee County, Georgia, and each Party
          irrevocably consents to the personal jurisdiction and venue of such courts and waives any
          objection based on inconvenient forum.
        </p>
        <p>
          <strong className="text-onyx">8.3 Arbitration.</strong> Except as set forth below, any
          dispute arising out of or relating to this Agreement shall be resolved by binding
          arbitration administered by the American Arbitration Association (&quot;AAA&quot;) under
          its Commercial Arbitration Rules, seated in Muscogee County, Georgia, before a single
          arbitrator, with judgment on the award enforceable in any court of competent jurisdiction.
          Notwithstanding the foregoing: (a) either Party may seek injunctive or other equitable
          relief in court for an actual or threatened breach of Section 6 (Confidentiality) or
          Section 3 (Intellectual Property Rights), without first resorting to arbitration; and (b)
          Magnolia Grove may, at its election, pursue collection of undisputed amounts owed under
          Section 4 in small claims court or the courts identified in Section 8.2, rather than
          arbitration.
        </p>
        <p>
          <strong className="text-onyx">8.4 Attorneys&apos; Fees.</strong> In any action or
          arbitration to enforce this Agreement, the prevailing Party shall be entitled to recover
          its reasonable attorneys&apos; fees and costs, in addition to any other relief awarded.
        </p>
        <p className="font-semibold text-onyx">
          8.5 Waiver of Jury Trial. To the extent permitted by law, and to the extent any dispute is
          not subject to arbitration under Section 8.3, each Party knowingly, voluntarily, and
          intentionally waives its right to a trial by jury in any litigation arising out of or
          relating to this Agreement.
        </p>
      </LegalSection>

      <LegalSection id="general-provisions" index="09" title="General Provisions">
        <p>
          <strong className="text-onyx">9.1 Independent Contractor.</strong> Magnolia Grove is an
          independent contractor, and nothing in this Agreement creates a partnership, joint
          venture, agency, or employment relationship between the Parties.
        </p>
        <p>
          <strong className="text-onyx">9.2 Assignment.</strong> Client may not assign this
          Agreement or any SOW without Magnolia Grove&apos;s prior written consent. Magnolia Grove
          may assign this Agreement in connection with a merger, acquisition, or sale of
          substantially all of its assets.
        </p>
        <p>
          <strong className="text-onyx">9.3 No Third-Party Beneficiaries.</strong> This Agreement is
          intended solely for the benefit of the Parties and does not confer any rights or remedies
          upon any third party.
        </p>
        <p>
          <strong className="text-onyx">9.4 Severability.</strong> If any provision of this
          Agreement is held invalid or unenforceable, that provision shall be modified to the
          minimum extent necessary to make it enforceable, or severed if modification is not
          possible, and the remaining provisions shall remain in full force and effect.
        </p>
        <p>
          <strong className="text-onyx">9.5 Waiver.</strong> No waiver of any provision of this
          Agreement shall be effective unless in writing, and no failure or delay in enforcing any
          provision shall constitute a waiver of future enforcement of that or any other provision.
        </p>
        <p>
          <strong className="text-onyx">9.6 Entire Agreement.</strong> This Agreement, together with
          all executed SOWs and invoices, constitutes the entire agreement between the Parties
          regarding the Services and supersedes all prior or contemporaneous understandings, whether
          written or oral, regarding the same subject matter.
        </p>
        <p>
          <strong className="text-onyx">9.7 Notices.</strong> All notices under this Agreement shall
          be in writing and delivered by email (with confirmation of receipt), certified mail, or
          courier to the addresses/contacts on file for each Party.
        </p>
        <p>
          <strong className="text-onyx">9.8 Electronic Signatures and Communications.</strong> The
          Parties agree that SOWs, invoices, and this Agreement may be executed and delivered
          electronically, and that electronic signatures shall have the same legal effect as
          handwritten signatures.
        </p>
        <p>
          <strong className="text-onyx">9.9 Publicity.</strong> Neither Party shall use the
          other&apos;s name, logo, or trademarks in any public statement or press release without
          prior written consent, except as permitted under Section 3.5.
        </p>
        <p>
          <strong className="text-onyx">9.10 Political Compliance Cooperation.</strong> Client
          agrees to provide Magnolia Grove, upon reasonable request, with any registration numbers,
          disclaimer language, or compliance information necessary for Magnolia Grove to properly
          execute Client&apos;s instructions in a manner consistent with applicable political
          advertising and disclosure requirements; Magnolia Grove&apos;s execution of such
          instructions does not constitute legal advice or a guarantee of Client&apos;s regulatory
          compliance.
        </p>
      </LegalSection>

      <div className="mt-10 border-t border-gold/15 pt-8">
        <h2 className="text-lg text-onyx">Acknowledgment</h2>
        <p className="mt-3 text-sm font-semibold text-onyx">
          By engaging Magnolia Grove Consultants&apos; services, executing a Statement of Work, or
          accessing magnoliagrovega.com, Client acknowledges that it has read and understood this
          Agreement and agrees to be bound by its terms.
        </p>
        <p className="mt-6 text-sm leading-relaxed text-onyx/80">
          <strong className="text-onyx">Magnolia Grove Consultants, LLC</strong>
          <br />
          Columbus, Georgia
          <br />
          Formed under the laws of the State of Georgia
          <br />
          Contact:{" "}
          <a href="mailto:ben@magnoliagrovega.com" className="text-gold-dark hover:text-onyx">
            ben@magnoliagrovega.com
          </a>{" "}
          | (706) 573-1719
        </p>
      </div>
    </LegalLayout>
  );
}
