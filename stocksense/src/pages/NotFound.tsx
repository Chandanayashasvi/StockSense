import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-steel-50 px-6 text-center gap-4">
      <p className="text-5xl font-bold text-ink-900 font-mono">404</p>
      <p className="text-steel-500 max-w-sm">This page doesn't exist, or you don't have access to it.</p>
      <Link to="/">
        <Button variant="secondary">Back to dashboard</Button>
      </Link>
    </div>
  );
}
