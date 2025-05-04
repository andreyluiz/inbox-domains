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
   * The password for authentication.
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

/**
 * Asynchronously fetches emails from an IMAP server based on the provided configuration.
 *
 * @param config The IMAP configuration.
 * @returns A promise that resolves to an array of Email objects.
 */
export async function fetchEmails(config: ImapConfig): Promise<Email[]> {
  // TODO: Implement this by calling an IMAP client library.
  console.log('Fetching emails using config:', config);

  // Stubbed data for demonstration
  return [
    { from: 'info@example.com' },
    { from: 'newsletter@example.com' },
    { from: 'info@promotions.example.com' },
    { from: 'info@account.example.com' },
    { from: 'support@otherdomain.com' },
  ];
}
