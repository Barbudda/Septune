import { CONTACT_EMAIL } from "@/lib/contact";

/**
 * Publisher details for the legal notice (mentions légales, required in
 * France for a site that sells: LCEN art. 6 III). They come from the
 * founder's registration (Guichet unique, formality J00295677454, validated
 * on 2026-10-28). Only what the law asks for a natural person who publishes
 * professionally is shown: name, address, phone, email and the registration
 * number. Nothing else from that record (birth details, social security)
 * belongs on the site or in this file.
 */
export const LEGAL = {
  name: "Hugo Moëne",
  status: "entrepreneur individuel (micro-entreprise)",
  address: "60 chemin des Fours à Chaux, 74320 Sevrier, France",
  siren: "132 159 203",
  siret: "132 159 203 00018",
  /** Registered in the Registre national des entreprises on this date. */
  registered: "28 October 2026",
  ape: "6201Z (computer programming)",
  /** Franchise en base de TVA: no VAT is charged. */
  vat: "VAT not applicable, article 293 B of the French tax code (CGI)",
  email: CONTACT_EMAIL,
  phone: "+33 6 24 51 09 09",
  director: "Hugo Moëne",
};

/** The host, as stated in Vercel's terms (vercel.com/legal/terms, checked 2026-10-25). */
export const HOST = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, United States",
  url: "https://vercel.com",
};

export const legalNoticeReady = Boolean(LEGAL.name && LEGAL.address && LEGAL.siret && LEGAL.email);
