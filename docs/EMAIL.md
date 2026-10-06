# Email setup and deliverability checklist

For the site owner. Everything the store emails goes out through Resend. This page covers what has to be set up so those emails reach inboxes, which settings the site reads, and how to send a test.

Anything marked **check in Resend dashboard** is something this repository cannot verify. Resend shows the exact records and their current status for your domain, and those values always win over anything written here.

## What the site sends

| Email                                                              | To                            | When                                                                                                 |
| ------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Request confirmation                                               | Customer                      | Right after a cart request is submitted. Nothing is charged.                                         |
| Quote with payment link                                            | Customer                      | When an admin sends the final quote from the dashboard.                                              |
| Payment received (receipt)                                         | Customer                      | When the payment is recorded as paid.                                                                |
| Order shipped                                                      | Customer                      | When an admin saves tracking details.                                                                |
| New cart order                                                     | Business inbox                | Right after a cart request is submitted. Includes back-office details; never forwarded to customers. |
| Strategy call, strategy session, payment request, merch quote form | Business inbox                | Website forms.                                                                                       |
| Strategy call and strategy session confirmations                   | Person who filled in the form | Website forms.                                                                                       |

Every message is sent as multipart: an HTML version and a plain-text version with the same facts. Customer replies go to the business inbox (`CONTACT_EMAIL_TO`). Customer emails never contain supplier names, product numbers, ESP+ links, or costs; automated tests enforce that.

## 1. Sending domain in Resend

1. In Resend, add the domain you send from (the part after the `@` in `CONTACT_EMAIL_FROM`). Use a domain you control. A subdomain such as `mail.yourdomain.com` keeps sending reputation separate from your main business mail and is a common choice.
2. Resend lists the DNS records to create. Add them at your DNS host, then press Verify in Resend. The domain must show as verified before mail will send from it.
3. Send only from an address on that verified domain. Mail "from" a domain Resend has not verified is rejected.

## 2. DNS records

These three mechanisms are what mailbox providers (Gmail, Outlook, Yahoo) check. Copy the actual values from Resend.

**SPF** (a TXT record that says which servers may send for the domain)

- Resend normally asks for an SPF TXT record, and often an MX record, on the sending (sub)domain. Use exactly what the dashboard shows. **Check in Resend dashboard.**
- A domain may have only one SPF record. If the domain already has one (for Google Workspace or similar), merge the new `include:` into it instead of adding a second record. Two SPF records both fail.

**DKIM** (a cryptographic signature; usually a TXT or CNAME record)

- Resend gives a record whose name looks like `resend._domainkey` and a long value. Add it exactly as shown. **Check in Resend dashboard.**
- If your DNS host appends the domain automatically, enter only the host part of the name, not the full name twice.

**DMARC** (a TXT record at `_dmarc.<your domain>` that tells receivers what to do when SPF/DKIM fail)

- Resend does not require it to send, but Gmail and Yahoo expect it for bulk senders, and it helps all senders. **Check in Resend dashboard** for whether it recommends a specific record.
- A safe starting record: name `_dmarc`, type TXT, value `v=DMARC1; p=none; rua=mailto:ben@magnoliagrovega.com`. `p=none` only monitors. Tighten to `p=quarantine`, then `p=reject`, after you have seen reports and confirmed all legitimate senders pass.
- DMARC passes when SPF or DKIM passes **and aligns** with the visible From domain. Sending from a domain verified in Resend, with its DKIM record in place, is what makes it align.

**Also worth checking**

- Return-path and tracking: if Resend offers a custom return-path or click/open tracking domain, set it up on the same domain for better alignment. Optional. **Check in Resend dashboard.**
- The `From` name should read like the business, for example `Magnolia Grove <orders@yourdomain.com>`. Avoid free-mail addresses (gmail.com and similar) in `CONTACT_EMAIL_FROM`; they cannot be authenticated for you.

## 3. Environment variables (names only)

Set these in the hosting provider's environment settings and in `.env.local` for development. Never commit values. `.env.example` lists them.

| Name                   | Purpose                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`       | Resend API key. Without it, no email is sent and the site logs a warning.                                                                      |
| `CONTACT_EMAIL_FROM`   | The From address, on the verified domain. Without it, no email is sent.                                                                        |
| `CONTACT_EMAIL_TO`     | Business inbox: receives notifications and customer replies. Defaults to the address in the site config if unset.                              |
| `ORDER_LINK_SECRET`    | Turns on the "Track your order" link in customer emails. Must be at least 16 characters. When unset or too short, the link is simply left out. |
| `NEXT_PUBLIC_SITE_URL` | The public address of the site, used to build the tracking link.                                                                               |

Business name, address, phone and email shown in the footer of customer emails come from `src/config/siteConfig.ts` (`contactDetails`), so changing them there updates the emails too.

## 4. Sending a test

Real mail is never sent from the automated tests; they use an in-memory stand-in.

**End to end on the live or staging site** (recommended):

1. Confirm the domain shows as verified in Resend and the three variables above are set in the environment you are testing.
2. Add something to the cart and submit a request using an address you can read (not the business inbox, so you see exactly what a customer sees).
3. You should receive the request confirmation within a minute, and the business inbox should receive the new-order notification.
4. From the admin dashboard, send the quote on that test order, then mark it paid and add tracking to see the other three emails. Cancel or delete the test order afterward.

**Check authentication on a received message.** In Gmail, open the message, choose Show original, and confirm SPF, DKIM and DMARC all say PASS. If any say FAIL or NEUTRAL, the matching record in section 2 is missing or wrong.

**Check the plain-text and mobile views.** In Gmail, "Show original" also shows the plain-text part. Open the email on a phone to confirm the item table reads cleanly.

**Resend dashboard.** The Emails tab shows each message as Delivered, Bounced or Complained, with the reason. **Check in Resend dashboard** if something does not arrive.

**Optional inbox-placement check.** Send one message to a free spam-test inbox (for example mail-tester.com) and read its report for missing records or content flags.

## 5. If email is not arriving

- Nothing at all and the site logs `RESEND_API_KEY / CONTACT_EMAIL_FROM not set`: one of the two variables is missing in that environment. Redeploy after setting them.
- Resend rejects the message: the From domain is not verified, or the key is for a different Resend account. The site logs the reason and the order itself still saves.
- Lands in spam: re-check SPF, DKIM and DMARC in section 2, and look at the sender reputation notes in Resend.
- The customer sees no tracking link: expected when `ORDER_LINK_SECRET` is unset or shorter than 16 characters.

## 6. Where the email code lives

- `src/lib/email.ts`: the send functions (one per email) and the Resend call.
- `src/lib/emailTemplates/`: the layout and every template (HTML and plain text).
- `__tests__/emailTemplates.test.ts`, `__tests__/merchEmails.test.ts`, `__tests__/emailEscaping.test.ts`, `__tests__/espLeak.test.tsx`: what the emails must contain and must never contain.
