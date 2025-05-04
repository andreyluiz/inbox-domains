'use server';

import type { ImapConfig, Email } from '@/services/imap';
import { fetchEmails } from '@/services/imap';
import { getRootDomain } from '@/lib/domain-utils';

interface DomainCount {
  domain: string;
  count: number;
}

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
  let domainCounts: DomainCount[] = [];
  const mailbox = onlyInbox ? 'INBOX' : '[Gmail]/All Mail'; // Choose mailbox based on parameter

  try {
    console.log(`[Server Action] Fetching emails for ${emailAddress} from ${mailbox} (Inbox Only: ${onlyInbox})`);
    // Pass the onlyInbox flag to fetchEmails
    emails = await fetchEmails(imapConfig, onlyInbox);
    console.log(`[Server Action] Fetched ${emails.length} email headers from ${mailbox} (limit 5000).`);

    const counts: Record<string, number> = {};
    emails.forEach((email) => {
      // Added check for null/undefined email.from
      if (email && email.from) {
          const rootDomain = getRootDomain(email.from);
          if (rootDomain) {
             counts[rootDomain] = (counts[rootDomain] || 0) + 1;
          }
      } else {
          console.warn("[Server Action] Encountered email with missing 'from' field.");
      }
    });

    domainCounts = Object.entries(counts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    console.log(`[Server Action] Processed domains for ${emailAddress}. Found ${domainCounts.length} unique domains from ${mailbox}.`);
    return { domainCounts, error: null, analyzedInboxOnly: onlyInbox };

  } catch (err) {
    console.error(`[Server Action] Failed to fetch or process emails from ${mailbox}:`, err);
    // Return the specific error message thrown by fetchEmails or a generic one
    const errorMessage = err instanceof Error ? err.message : "Could not retrieve or process email data.";
    return { domainCounts: null, error: errorMessage, analyzedInboxOnly: onlyInbox };
  }
}
