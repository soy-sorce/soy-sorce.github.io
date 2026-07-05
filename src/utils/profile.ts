import { z } from "zod";
import profileRaw from "../data/profile.yml";
import linksRaw from "../data/links.yml";
import bioRaw from "../data/bio.yml";
import interestsRaw from "../data/interests.yml";
import type { Locale } from "./i18n";

const LocalizedString = z.object({ ja: z.string(), en: z.string() });
const LocalizedList = z.object({
  ja: z.array(z.string()),
  en: z.array(z.string()),
});

const ProfileSchema = z.object({
  name: LocalizedString,
  headline: LocalizedString,
  hero: LocalizedList,
});

const LinkEntrySchema = z.object({
  label: z.string(),
  url: z.string(),
  display: z.string().optional(),
});

const LinksSchema = z.object({
  links: z.object({
    github: LinkEntrySchema,
    x: LinkEntrySchema,
    linkedin: LinkEntrySchema,
    zenn: LinkEntrySchema,
    googleScholar: LinkEntrySchema,
    email: LinkEntrySchema,
  }),
});

const BioPeriodSchema = z.object({
  startYear: z.number(),
  startMonth: z.number().min(1).max(12).optional(),
  endYear: z.number().nullable().optional(),
  endMonth: z.number().min(1).max(12).optional(),
});

const EducationEntrySchema = BioPeriodSchema.extend({
  institution: LocalizedString,
  description: LocalizedString,
});

const WorkEntrySchema = BioPeriodSchema.extend({
  company: LocalizedString,
  title: LocalizedString,
  description: LocalizedString,
});

const BioSchema = z.object({
  education: z.array(EducationEntrySchema),
  work: z.array(WorkEntrySchema),
});

const InterestsSchema = z.object({ researchInterests: LocalizedList });

export function getProfile() {
  return ProfileSchema.parse(profileRaw);
}

export function getLinks() {
  return LinksSchema.parse(linksRaw).links;
}

export function getBio() {
  return BioSchema.parse(bioRaw);
}

function formatYearMonth(year: number, month: number | null | undefined): string {
  if (!month) return String(year);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatBioPeriod(
  startYear: number,
  startMonth: number | null | undefined,
  endYear: number | null | undefined,
  endMonth: number | null | undefined,
  locale: Locale
): string {
  const start = formatYearMonth(startYear, startMonth);
  const end = endYear ? formatYearMonth(endYear, endMonth) : locale === "ja" ? "現在" : "Present";
  return `${start} ~ ${end}`;
}

export function getInterests() {
  return InterestsSchema.parse(interestsRaw).researchInterests;
}
