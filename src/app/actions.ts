
'use server';

import type { ImapConfig, Email } from '@/services/imap';
import { fetchEmails } from '@/services/imap';
import { getRootDomain } from '@/lib/domain-utils';

// Represents the count for a specific email address within a domain
interface EmailCount {
  email: string;
  count: number;
}

// Represents the total count for a domain and the breakdown by email address
interface DomainCount {
  domain: string;
  count: number; // Total count for the domain
  emails: EmailCount[]; // Breakdown by specific email address
}

// Updated result structure
export interface DomainCountResult {
    domainCounts: DomainCount[] | null;
    error: string | null;
    analyzedInboxOnly: boolean; // Keep track of the setting used for the analysis
}

// Server Action to fetch and process emails
export async function getEmailDomains(emailAddress: string, appPassword: string, onlyInbox: boolean): Promise<DomainCountResult> {
  // Basic validation for Gmail address
  if (!emailAddress || !emailAddress.endsWith('@gmail.com')) {
     return { domainCounts: null, error: "Please provide a valid Gmail address.", analyzedInboxOnly: onlyInbox };
  }
   if (!appPassword) {
       return { domainCounts: null, error: "App Password is required.", analyzedInboxOnly: onlyInbox };
   }

  const imapConfig: ImapConfig = {
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    username: emailAddress,
    password: appPassword, // Use the App Password here
  };

  let emails: Email[] = [];
  const mailbox = onlyInbox ? 'INBOX' : '[Gmail]/All Mail'; // Choose mailbox based on parameter

  try {
    console.log(`[Server Action] Fetching emails for ${emailAddress} from ${mailbox} (Inbox Only: ${onlyInbox})`);
    // Pass the onlyInbox flag to fetchEmails
    emails = await fetchEmails(imapConfig, onlyInbox);
    console.log(`[Server Action] Fetched ${emails.length} email headers from ${mailbox} (limit 5000).`);

    // Structure to hold domain details including email breakdowns
    const domainDetails: Record<string, { totalCount: number; emails: Record<string, number> }> = {};

    emails.forEach((email) => {
      // Added check for null/undefined email.from
      if (email && email.from) {
          const rootDomain = getRootDomain(email.from);
          const fromAddress = email.from; // Keep the full address for breakdown
          if (rootDomain) {
             // Initialize domain entry if it doesn't exist
             if (!domainDetails[rootDomain]) {
               domainDetails[rootDomain] = { totalCount: 0, emails: {} };
             }
             // Increment total count for the domain
             domainDetails[rootDomain].totalCount += 1;

             // Initialize and increment count for the specific email address within the domain
             if (!domainDetails[rootDomain].emails[fromAddress]) {
               domainDetails[rootDomain].emails[fromAddress] = 0;
             }
             domainDetails[rootDomain].emails[fromAddress] += 1;
          }
      } else {
          console.warn("[Server Action] Encountered email with missing 'from' field.");
      }
    });

    // Transform domainDetails into sorted DomainCount array
    const sortedDomainCounts: DomainCount[] = Object.entries(domainDetails)
      .map(([domain, data]) => ({
        domain,
        count: data.totalCount,
        // Sort emails within the domain by count descending
        emails: Object.entries(data.emails)
          .map(([email, count]) => ({ email, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count); // Sort domains by total count descending

    console.log(`[Server Action] Processed domains for ${emailAddress}. Found ${sortedDomainCounts.length} unique domains from ${mailbox}.`);
    return { domainCounts: sortedDomainCounts, error: null, analyzedInboxOnly: onlyInbox };

  } catch (err) {
    console.error(`[Server Action] Failed to fetch or process emails from ${mailbox}:`, err);
    // Return the specific error message thrown by fetchEmails or a generic one
    const errorMessage = err instanceof Error ? err.message : "Could not retrieve or process email data.";
    return { domainCounts: null, error: errorMessage, analyzedInboxOnly: onlyInbox };
  }
}
