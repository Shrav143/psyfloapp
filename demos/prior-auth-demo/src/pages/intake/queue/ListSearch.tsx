import { useSearchParams } from "react-router-dom";
import { SearchInput } from "@/components/ui";

/** The search of a list, kept in the address (?q=). `alsoClear` names parameters a new search drops (the Referral Queue leaves its transition view). */
export function ListSearch({ placeholder = "Search by ID, initials, source or service", alsoClear = [] }: { placeholder?: string; alsoClear?: string[] }) {
  const [params, setParams] = useSearchParams();
  return (
    <SearchInput
      value={params.get("q") ?? ""}
      onChange={(v) =>
        setParams((p) => {
          const n = new URLSearchParams(p);
          if (v) n.set("q", v);
          else n.delete("q");
          for (const k of alsoClear) n.delete(k);
          return n;
        }, { replace: true })
      }
      placeholder={placeholder}
      className="w-[230px] max-w-full min-[1280px]:w-[300px]"
    />
  );
}
