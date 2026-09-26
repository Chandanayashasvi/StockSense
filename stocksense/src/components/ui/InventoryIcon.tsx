import type { ReactNode, SVGProps } from "react";

export type InventoryIconName =
  | "dashboard" | "package" | "warehouse" | "packageIn" | "truck" | "transfer"
  | "adjustment" | "history" | "settings" | "bell" | "search" | "user"
  | "barcode" | "chart" | "emptyBox" | "layers" | "location" | "logout" | "warning";

const shapes: Record<InventoryIconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /></>,
  package: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
  warehouse: <><path d="M3 10 12 4l9 6v10H3V10Z" /><path d="M7 20v-6h10v6M8 10h.01M12 10h.01M16 10h.01" /></>,
  packageIn: <><path d="m12 3 8 4.5v6M4 7.5 12 12l8-4.5M12 12v5" /><path d="M4 7.5V16l8 5 4-2.5M12 21v-4m0 0 3 3m-3-3-3 3" /></>,
  truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  transfer: <><path d="M4 8h15l-3-3m3 3-3 3M20 16H5l3 3m-3-3 3-3" /><path d="M7 11v2m10-2v2" /></>,
  adjustment: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3.5h6M8 11h8M8 16h3m3 0h2" /><path d="M16 14v4m-2-2h4" /></>,
  history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></>,
  settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.4.8l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.4-.8l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.7l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.4-.8l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.4.8l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.6Z" transform="translate(-1 -1) scale(.92)" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  barcode: <><path d="M4 5v14M7 5v14M10 5v14M14 5v14M16 5v14M20 5v14" /><path d="M3 3h18M3 21h18" /></>,
  chart: <><path d="M4 20V4m0 16h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
  emptyBox: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v8l9 5 9-5V8" /><path d="m9 10 6 4m0-4-6 4" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  warning: <><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
};

interface InventoryIconProps extends SVGProps<SVGSVGElement> {
  name: InventoryIconName;
  label?: string;
}

export default function InventoryIcon({ name, label, className = "h-5 w-5", ...rest }: InventoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {shapes[name]}
    </svg>
  );
}