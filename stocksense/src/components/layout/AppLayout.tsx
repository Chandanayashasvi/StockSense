import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// Every authenticated page wraps its content in <AppShell title="…">.
// Simpler than route-nested layouts for a hackathon-scale app, and keeps
// each page's title colocated with the page itself.
export default function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-steel-50">
      <Sidebar />
      <div className="md:pl-60 flex flex-col min-h-screen bg-steel-50">
        <Topbar title={title} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
