import { z } from "zod";
import profileRaw from "../data/profile.yml";
import linksRaw from "../data/links.yml";
import bioRaw from "../data/bio.yml";
import interestsRaw from "../data/interests.yml";

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

const BioSchema = z.object({ bio: LocalizedList });

const InterestsSchema = z.object({ researchInterests: LocalizedList });

export function getProfile() {
  return ProfileSchema.parse(profileRaw);
}

export function getLinks() {
  return LinksSchema.parse(linksRaw).links;
}

export function getBio() {
  return BioSchema.parse(bioRaw).bio;
}

export function getInterests() {
  return InterestsSchema.parse(interestsRaw).researchInterests;
}
