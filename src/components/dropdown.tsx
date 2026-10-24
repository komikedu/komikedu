import { ChevronDown } from "lucide-react";

/**
 * Dropdown standar aplikasi: <select> asli (tetap ramah keyboard, pembaca layar, dan layar sentuh) dengan panah dari pustaka
 * ikon (lucide), bukan panah bawaan peramban yang menempel di tepi kanan. Pakai ini setiap membuat dropdown.
 * `className` mengatur tampilan kotak pilihan; `wadah` mengatur pembungkus (lebar bawaan penuh).
 */
export function Dropdown({ className = "", wadah = "w-full", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { wadah?: string }) {
  return (
    <span className={`relative block ${wadah}`}>
      {/* ruang kanan 2,25rem agar teks tidak menimpa ikon dan ikon tidak mepet tepi */}
      <select {...props} className={`w-full min-w-0 cursor-pointer appearance-none ${className}`} style={{ paddingRight: "2.25rem", ...props.style }}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 ${props.disabled ? "opacity-40" : ""}`} />
    </span>
  );
}
