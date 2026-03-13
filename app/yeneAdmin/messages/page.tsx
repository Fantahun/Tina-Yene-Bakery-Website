"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Search, CheckCircle, Circle, MailOpen, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<ContactSubmission | null>(null);
  const [isTogglingMap, setIsTogglingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Default to last 30 days if not set
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;

    // Debounce search
    const timer = setTimeout(() => {
      fetchMessages();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, page, limit, search]);

  async function fetchMessages() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        search,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/messages?${params}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.messages);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleReadStatus(id: string, currentStatus: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    setIsTogglingMap(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update message");

      setMessages(prev => prev.map(msg =>
        msg.id === id ? { ...msg, isRead: !currentStatus } : msg
      ));
    } catch (error) {
      console.error(error);
    } finally {
      setIsTogglingMap(prev => ({ ...prev, [id]: false }));
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Messages</CardTitle>
          <CardDescription>View contact form submissions by date range.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="grid gap-2 w-full md:w-auto flex-1 md:flex-none">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="search"
                  placeholder="Search name, email, subject..."
                  className="pl-8 w-full md:w-[250px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Page Size</Label>
              <Select
                value={limit.toString()}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No messages found.
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((msg) => (
                  <TableRow
                    key={msg.id}
                    className={`cursor-pointer ${!msg.isRead ? "bg-muted/30 font-medium" : ""}`}
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => toggleReadStatus(msg.id, msg.isRead, e)}
                        disabled={isTogglingMap[msg.id]}
                        title={msg.isRead ? "Mark as unread" : "Mark as read"}
                      >
                        {isTogglingMap[msg.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : msg.isRead ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary fill-primary/20" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(msg.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{msg.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{msg.email}</span>
                        {msg.phone && <span className="text-muted-foreground">{msg.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{msg.subject || "No Subject"}</TableCell>
                    <TableCell className="max-w-md truncate" title={msg.message}>
                      {msg.message}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMessage(msg);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {messages.length} of {total} messages
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <div className="flex items-center text-sm font-medium">
            Page {page} of {Math.max(1, Math.ceil(total / limit))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= Math.ceil(total / limit) || loading}
          >
            Next
          </Button>
        </div>
      </div>

       <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
             <DialogDescription>
              Received on {selectedMessage && format(new Date(selectedMessage.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold">From</Label>
                <div className="col-span-3">
                  {selectedMessage.name} &lt;{selectedMessage.email}&gt;
                </div>
              </div>
              {selectedMessage.phone && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-semibold">Phone</Label>
                  <div className="col-span-3">{selectedMessage.phone}</div>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold">Subject</Label>
                <div className="col-span-3">{selectedMessage.subject || "No Subject"}</div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Label className="text-right font-semibold mt-2">Message</Label>
                <div className="col-span-3 rounded-md border p-3 text-sm bg-muted/50 whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

