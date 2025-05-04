'use client';

import type { ImapConfig } from '@/services/imap';
import { getRootDomain } from '@/lib/domain-utils';
import { getEmailDomains, type DomainCountResult } from '@/app/actions'; // Import server action
import React, { useState, useTransition } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, Loader2, AlertTriangle, Info, Archive, Inbox } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; // Import Form components

// Input Schema for the form
const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  appPassword: z.string().min(1, { message: 'App Password is required.' }),
  onlyInbox: z.boolean().default(true).describe('Whether to analyze only Inbox emails'),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const [domainData, setDomainData] = useState<DomainCountResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      appPassword: '',
      onlyInbox: true, // Default to analyzing Inbox only
    },
  });

  const onSubmit: SubmitHandler<FormData> = (data) => {
    setError(null);
    setDomainData(null); // Clear previous results
    startTransition(async () => {
      try {
        const result = await getEmailDomains(data.email, data.appPassword, data.onlyInbox);
        if (result.error) {
          setError(result.error);
        } else {
          setDomainData(result);
        }
      } catch (err) {
        console.error('Error calling server action:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const analyzedScopeText = domainData?.analyzedInboxOnly ? 'in your Inbox' : 'across all emails (including archived)';
  const formScopeText = form.watch('onlyInbox') ? 'emails currently in your Inbox' : 'all emails (Inbox + Archived)';

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12 bg-background">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center bg-secondary rounded-t-lg p-6">
          <div className="flex justify-center items-center mb-2">
            <Globe className="w-8 h-8 text-primary mr-2" />
            <CardTitle className="text-2xl font-bold text-primary">Inbox Insights</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Connect to your Gmail account to discover the websites sending you the most email.
            Analyzes the last 5000 <strong className="text-foreground">{formScopeText}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Alert variant="default" className="bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                <Info className="h-4 w-4 !text-blue-800 dark:!text-blue-200" />
                <AlertTitle>App Password Required</AlertTitle>
                <AlertDescription>
                  For security, Gmail requires using an "App Password" instead of your regular password.
                  You can generate one at: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">myaccount.google.com/apppasswords</a>.
                  This password is only used to connect to your inbox and is not stored permanently.
                </AlertDescription>
              </Alert>

              <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel htmlFor="email">Gmail Address</FormLabel>
                          <FormControl>
                              <Input
                                  id="email"
                                  type="email"
                                  placeholder="your.email@gmail.com"
                                  autoComplete="email"
                                  {...field}
                                  aria-invalid={form.formState.errors.email ? "true" : "false"}
                              />
                          </FormControl>
                           <FormMessage />
                      </FormItem>
                  )}
              />

              <FormField
                  control={form.control}
                  name="appPassword"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel htmlFor="appPassword">Gmail App Password</FormLabel>
                          <FormControl>
                              <Input
                                  id="appPassword"
                                  type="password"
                                  placeholder="Enter 16-character App Password"
                                  {...field}
                                  aria-invalid={form.formState.errors.appPassword ? "true" : "false"}
                              />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />

              <FormField
                control={form.control}
                name="onlyInbox"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center">
                         {field.value ? <Inbox className="w-4 h-4 mr-2 text-primary"/> : <Archive className="w-4 h-4 mr-2 text-secondary-foreground"/>}
                         Analyze Scope
                      </FormLabel>
                      <FormDescription>
                        {field.value
                          ? "Only analyze emails currently in your Inbox."
                          : "Analyze all emails (including archived)."}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Toggle between analyzing only inbox or all emails"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
                  </>
                ) : (
                  'Analyze Emails'
                )}
              </Button>
            </form>
          </Form>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isPending && !error && (
            <div className="flex justify-center items-center p-6 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fetching and analyzing emails ({form.getValues('onlyInbox') ? 'Inbox only' : 'All emails'})... this might take a few minutes.
            </div>
          )}

          {domainData && !error && domainData.domainCounts && (
            domainData.domainCounts.length > 0 ? (
              <>
                <p className="text-sm text-center text-muted-foreground pt-4">
                  Showing results for emails analyzed <strong className="text-foreground">{analyzedScopeText}</strong>.
                </p>
                <ScrollArea className="h-[40vh] w-full border rounded-md mt-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                      <TableRow>
                        <TableHead className="w-[70%] text-foreground font-semibold">Website Domain</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Email Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domainData.domainCounts.map(({ domain, count }) => (
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
              </>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No email data found or processed from the last 5000 emails {analyzedScopeText}.
              </div>
            )
          )}
        </CardContent>
        {domainData && !error && domainData.domainCounts && domainData.domainCounts.length > 0 && (
          <CardFooter className="text-center border-t p-4 bg-secondary rounded-b-lg justify-center">
            <CardDescription className="text-sm text-muted-foreground">
              Found emails from <strong className="text-accent">{domainData.domainCounts.length}</strong> unique websites in your last 5000 emails {analyzedScopeText}.
            </CardDescription>
          </CardFooter>
        )}
        {domainData && !error && domainData.domainCounts && domainData.domainCounts.length === 0 && (
          <CardFooter className="text-center border-t p-4 bg-secondary rounded-b-lg justify-center">
            <CardDescription className="text-sm text-muted-foreground">
              No emails found from recognizable domains in your last 5000 emails {analyzedScopeText}.
            </CardDescription>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
