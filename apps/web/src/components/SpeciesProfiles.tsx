import type {
  SpeciesProfile,
  EdibilityRating,
} from "@volare-consulting/fishon";
import { ExternalLink, Fish } from "lucide-react";
import { FishImage } from "./FishImage";

const FISH_RULES_URL = "https://app.fishrulesapp.com/";

// Deep-link to the species' regulation page when we know its id, else the home.
function fishRulesLink(profile: SpeciesProfile): string {
  const id = profile.regulation?.regulationId;
  if (id === undefined) return FISH_RULES_URL;
  return `https://app.fishrulesapp.com/regulations/${id}?species=${encodeURIComponent(
    profile.commonName
  )}`;
}

const EDIBILITY: Record<EdibilityRating, { label: string; className: string }> = {
  yum: { label: "Yum", className: "border-success/40 bg-success/10 text-success" },
  meh: { label: "Meh", className: "border-warning/40 bg-warning/10 text-warning" },
  yuck: { label: "Yuck", className: "border-error/40 bg-error/10 text-error" },
  unknown: { label: "Edibility ?", className: "border-line bg-sunken text-ink-3" },
};

interface ChipProps {
  children: React.ReactNode;
  className: string;
  title?: string;
}

function Chip({ children, className, title }: ChipProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

interface RegulationChipsProps {
  profile: SpeciesProfile;
}

const REG_CHIP = "border-brand/30 bg-brand-subtle text-brand";

function StatusChip({ profile }: RegulationChipsProps) {
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

function RegulationChips({ profile }: RegulationChipsProps) {
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

interface SpeciesProfilesProps {
  profiles: SpeciesProfile[];
}

export function SpeciesProfiles({ profiles }: SpeciesProfilesProps) {
  if (profiles.length === 0) return null;
  // The regulations link is per-state (identical for every fish), so show it
  // once for the whole section rather than on each card.
  const regulations = profiles[0];
  const hasFishRules = profiles.some((profile) => profile.regulation);

  return (
    <div className="rounded-xl border border-line bg-raised p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Fish className="h-4 w-4 text-brand" /> Fish profiles
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const edibility = EDIBILITY[profile.edibility] ?? EDIBILITY.unknown;
          return (
            <a
              key={profile.scientificName}
              href={fishRulesLink(profile)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Look up ${profile.commonName} in Fish Rules`}
              className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition hover:border-brand hover:shadow-sm"
            >
              <div className="relative h-36 w-full bg-sunken">
                <FishImage src={profile.imageUrl} alt={profile.commonName} />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div>
                  <div className="text-sm font-semibold capitalize text-ink">
                    {profile.commonName}
                  </div>
                  <div className="text-xs italic text-ink-3">
                    {profile.scientificName}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip className={edibility.className} title={profile.edibilityNote ?? "Edibility unknown"}>
                    {edibility.label}
                  </Chip>
                  <RegulationChips profile={profile} />
                </div>
                {profile.summary && (
                  <p className="line-clamp-3 text-xs text-ink-2">{profile.summary}</p>
                )}
              </div>
            </a>
          );
        })}
      </div>

      {regulations && (
        <p className="mt-3 text-xs text-ink-2">
          {hasFishRules
            ? "Season, bag & size shown for your location via Fish Rules — always confirm the full rules: "
            : "Always confirm current size, bag, and season limits before keeping fish: "}
          <a
            href={regulations.regulationsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {regulations.regulationsLabel}
          </a>
        </p>
      )}
      <p className="mt-1 text-xs text-ink-3">
        Regulations & photos via Fish Rules; descriptions via Wikipedia.
        Edibility is a non-official, best-effort signal — verify locally.
      </p>
    </div>
  );
}
