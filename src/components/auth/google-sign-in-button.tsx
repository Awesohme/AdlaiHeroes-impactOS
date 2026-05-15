"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoogleSignInButton({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full", className)}
      disabled={pending}
      onClick={() => {
        setPending(true);
        window.location.assign(href);
      }}
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="mr-2 h-4 w-4 shrink-0" />
      )}
      {pending ? "Trying Google..." : "Continue with Google"}
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.805 12.227c0-.818-.073-1.604-.209-2.364H12v4.473h5.488a4.694 4.694 0 0 1-2.036 3.08v2.558h3.294c1.929-1.777 3.059-4.396 3.059-7.747Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.619-2.426l-3.294-2.558c-.916.614-2.089.977-3.325.977-2.554 0-4.718-1.724-5.492-4.04H3.103v2.638A9.997 9.997 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.508 13.953A5.997 5.997 0 0 1 6.2 12c0-.679.117-1.336.308-1.953V7.409H3.103A9.997 9.997 0 0 0 2 12c0 1.611.385 3.136 1.103 4.591l3.405-2.638Z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.977c1.468 0 2.784.505 3.821 1.495l2.866-2.866C16.959 2.995 14.695 2 12 2a9.997 9.997 0 0 0-8.897 5.409l3.405 2.638c.774-2.316 2.938-4.07 5.492-4.07Z"
        fill="#EA4335"
      />
    </svg>
  );
}
