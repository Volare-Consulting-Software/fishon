import type { SpeciesProfile, EdibilityRating } from "@volare-consulting/fishon";

export const FISH_RULES_URL = "https://app.fishrulesapp.com/";

export const EDIBILITY: Record<
  EdibilityRating,
  { label: string; className: string }
> = {
  yum: { label: "Yum", className: "border-success/40 bg-success/10 text-success" },
  meh: { label: "Meh", className: "border-warning/40 bg-warning/10 text-warning" },
  yuck: { label: "Yuck", className: "border-error/40 bg-error/10 text-error" },
  unknown: { label: "Edibility ?", className: "border-line bg-sunken text-ink-3" },
};

const REG_CHIP = "border-brand/30 bg-brand-subtle text-brand";

// Deep-link to the species' regulation page when we know its id, else the home.
export function fishRulesLink(profile: SpeciesProfile): string {
  const id = profile.regulation?.regulationId;
  if (id === undefined) return FISH_RULES_URL;
  return `https://app.fishrulesapp.com/regulations/${id}?species=${encodeURIComponent(
    profile.commonName
  )}`;
}

interface ChipProps {
  children: React.ReactNode;
  className: string;
  title?: string;
}

export function Chip({ children, className, title }: ChipProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function StatusChip({ profile }: { profile: SpeciesProfile }) {
  const reg = profile.regulation;
  if (!reg) return null;
  switch (reg.status) {
    case "prohibited":
      return (
        <Chip
          className="border-error/40 bg-error/10 text-error"
          title={`No harvest · ${reg.locationName}`}
        >
          No harvest
        </Chip>
      );
    case "out-of-season":
      return (
        <Chip
          className="border-warning/40 bg-warning/10 text-warning"
          title={`Closed season right now · ${reg.locationName}`}
        >
          Out of season
        </Chip>
      );
    default:
      return (
        <Chip
          className="border-success/40 bg-success/10 text-success"
          title={`Open season · ${reg.locationName}`}
        >
          Open
        </Chip>
      );
  }
}

export function RegulationChips({ profile }: { profile: SpeciesProfile }) {
  const reg = profile.regulation;
  if (!reg) return null;
  const unit = reg.sizeUnit ?? "in";
  return (
    <>
      <StatusChip profile={profile} />
      {reg.bagLimit !== null && (
        <Chip className={REG_CHIP} title={`Daily bag limit · ${reg.locationName}`}>
          Bag {reg.bagLimit}
        </Chip>
      )}
      {reg.minSize !== null && (
        <Chip className={REG_CHIP} title={`Minimum size · ${reg.locationName}`}>
          Min {reg.minSize}
          {unit}
        </Chip>
      )}
      {reg.maxSize !== null && (
        <Chip className={REG_CHIP} title={`Maximum size · ${reg.locationName}`}>
          Max {reg.maxSize}
          {unit}
        </Chip>
      )}
      {reg.minSlotSize !== null && reg.maxSlotSize !== null && (
        <Chip className={REG_CHIP} title={`Slot limit · ${reg.locationName}`}>
          Slot {reg.minSlotSize}–{reg.maxSlotSize}
          {unit}
        </Chip>
      )}
      {reg.measurementName && (
        <Chip
          className="border-line bg-sunken text-ink-2"
          title="How length is measured"
        >
          {reg.measurementName}
        </Chip>
      )}
    </>
  );
}
