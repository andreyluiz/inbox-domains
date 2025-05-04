import { ImapFlow } from 'imapflow';
import type { Logger } from 'imapflow';

/**
 * Represents the configuration needed to connect to an IMAP server.
 */
export interface ImapConfig {
  /**
   * The host address of the IMAP server.
   */
  host: string;
  /**
   * The port number of the IMAP server.
   */
  port: number;
  /**
   * Whether to use TLS/SSL for the connection.
   */
  tls: boolean;
  /**
   * The username for authentication.
   */
  username: string;
  /**
   * The password for authentication (use App Password for Gmail).
   */
  password: string;
}

/**
 * Represents a simplified email message with only the sender's address.
 */
export interface Email {
  /**
   * The sender's email address.
   */
  from: string;
}

// Optional: Custom logger to suppress verbose imapflow logs in production
const imapLogger: Logger = ( TName, TLevel, ...rest ) => {
    if (process.env.NODE_ENV !== 'production' || TLevel === 'error' || TLevel === 'warn') {
        console.log( `[IMAP ${TLevel}]`, TName, ...rest );
    }
};


/**
 * Asynchronously fetches emails from an IMAP server based on the provided configuration.
 * Fetches the 'From' address of the last 5000 emails in the INBOX.
 *
 * @param config The IMAP configuration.
 * @returns A promise that resolves to an array of Email objects.
 * @throws Throws an error if connection, authentication, or fetching fails.
 */
export async function fetchEmails(config: ImapConfig): Promise<Email[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: {
      user: config.username,
      pass: config.password,
    },
    logger: imapLogger, // Use custom logger
  });

  const emails: Email[] = [];
  const EMAIL_FETCH_LIMIT = 5000; // Increased limit

  try {
    console.log(`Attempting to connect to IMAP server ${config.host}...`);
    await client.connect();
    console.log("IMAP connection successful.");

    try {
      console.log("Opening INBOX...");
      const lock = await client.getMailboxLock('INBOX');
      try {
        console.log(`Fetching last ${EMAIL_FETCH_LIMIT} email UIDs...`);
        // Get sequence numbers of all messages, then slice the last N
        const messages = await client.search({ all: true }, { uid: true });
        const lastUids = messages.slice(-EMAIL_FETCH_LIMIT); // Get the last N UIDs

        if (lastUids.length === 0) {
          console.log("No emails found in INBOX.");
          return [];
        }

        console.log(`Fetching 'FROM' header for ${lastUids.length} emails (limit: ${EMAIL_FETCH_LIMIT})... This might take a while.`);
        // Fetch only the envelope data for the selected UIDs
        // Fetch in chunks to potentially avoid overwhelming the server/client
        const CHUNK_SIZE = 500; // Process 500 emails at a time
        for (let i = 0; i < lastUids.length; i += CHUNK_SIZE) {
            const chunkUids = lastUids.slice(i, i + CHUNK_SIZE);
             console.log(`Fetching chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(lastUids.length / CHUNK_SIZE)} (UIDs ${chunkUids[0]}...${chunkUids[chunkUids.length - 1]})`);
            const fetchGenerator = client.fetch(chunkUids.join(','), { envelope: true }, { uid: true });

            for await (const msg of fetchGenerator) {
              const fromAddress = msg.envelope?.from?.[0]?.address;
              if (fromAddress) {
                emails.push({ from: fromAddress });
              } else {
                console.warn(`Could not extract 'from' address for UID ${msg.uid}`);
              }
            }
         }
        console.log(`Successfully fetched 'FROM' for ${emails.length} emails.`);
      } finally {
        await lock.release();
        console.log("INBOX lock released.");
      }
    } catch (mailboxError) {
       console.error("Error accessing INBOX:", mailboxError);
       throw new Error("Failed to access the INBOX. Please check permissions or folder name.");
    }

  } catch (err: any) {
    console.error('IMAP operation failed:', err);
    // Provide more specific error messages
    if (err.code === 'AUTHENTICATIONFAILED' || err.response?.includes('AUTHENTICATIONFAILED')) {
        throw new Error("Authentication failed. Please check your email address and App Password.");
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        throw new Error(`Could not connect to the IMAP server (${config.host}). Please check the host and port, and your internet connection.`);
    }
    throw new Error(`An IMAP error occurred: ${err.message || 'Unknown error'}`);
  } finally {
    // Ensure logout happens even if errors occurred
    if (client.usable) {
      try {
        console.log("Logging out from IMAP server...");
        await client.logout();
        console.log("IMAP logout successful.");
      } catch (logoutErr) {
        console.error("Error during IMAP logout:", logoutErr);
        // Don't re-throw logout errors if already handling a primary error
      }
    } else {
        console.log("IMAP client not usable, skipping logout.");
    }
  }

  return emails;
}
