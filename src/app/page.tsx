import type { ImapConfig, Email } from '@/services/imap';
import { fetchEmails } from '@/services/imap';
import { getRootDomain } from '@/lib/domain-utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Globe } from 'lucide-react';

interface DomainCount {
  domain: string;
  count: number;
}

export default async function Home() {
  // Dummy config - replace with actual user input mechanism if needed
  const imapConfig: ImapConfig = {
    host: 'imap.example.com',
    port: 993,
    tls: true,
    username: 'user@example.com',
    password: 'password',
  };

  let emails: Email[] = [];
  let error: string | null = null;
  let domainCounts: DomainCount[] = [];

  try {
    emails = await fetchEmails(imapConfig);

    const counts: Record<string, number> = {};
    emails.forEach((email) => {
      const rootDomain = getRootDomain(email.from);
      if (rootDomain) {
        counts[rootDomain] = (counts[rootDomain] || 0) + 1;
      }
    });

    domainCounts = Object.entries(counts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

  } catch (err) {
    console.error("Failed to fetch or process emails:", err);
    error = "Could not fetch email data. Please check the connection settings or try again later.";
    // In a real app, you might want to use a logging service here
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 lg:p-12 bg-background">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center bg-secondary rounded-t-lg p-6">
          <div className="flex justify-center items-center mb-2">
             <Globe className="w-8 h-8 text-primary mr-2" />
             <CardTitle className="text-2xl font-bold text-primary">Inbox Insights</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Discover the websites sending you the most email.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
          ) : domainCounts.length > 0 ? (
            <ScrollArea className="h-[60vh] w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead className="w-[70%] text-foreground font-semibold">Website Domain</TableHead>
                    <TableHead className="text-right text-foreground font-semibold">Email Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domainCounts.map(({ domain, count }) => (
                    <TableRow key={domain} className="hover:bg-accent/10">
                      <TableCell className="font-medium">{domain}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {count}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              No email data found or processed.
            </div>
          )}
        </CardContent>
        {domainCounts.length > 0 && (
           <CardHeader className="text-center border-t p-4 bg-secondary rounded-b-lg">
                <CardDescription className="text-sm text-muted-foreground">
                    Found emails from <strong className="text-accent">{domainCounts.length}</strong> unique websites.
                </CardDescription>
           </CardHeader>
        )}
      </Card>
    </main>
  );
}

// Add `use client` directive if using client-side data fetching or state later
// "use client"; (if needed)
