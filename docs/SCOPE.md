# Aliquot — Product Name & v1 Scope

**Status:** Agreed · 1 Nov 2026

## Name
- Product name: **Aliquot** (may change later).
- The name is **never hard-coded**. It lives in config (`PLATFORM_NAME`, `PLATFORM_DOMAIN`), and UI, emails, PDFs and messages read from there. Each tenant's own lab name/branding shows to its staff and patients.

## Build order
- v1 includes all three sections; stages and their order are in BUILD_PLAN.md (no fixed dates).
- Build order: Chemical Pathology → Haematology → Medical Microbiology.
- E-commerce project starts after v1 ships.

## Sections in v1

### Chemical Pathology
- Numeric results with units, reference ranges by sex and age, critical limits.
- Panels: E/U/Cr, LFT, lipid profile, FBS/RBS, uric acid (catalogue is configurable per lab).
- Calculated values: eGFR (CKD-EPI 2021), Friedewald LDL, anion gap.

### Haematology
- FBC with all analyzer parameters, plus a differential count.
- Blood film comment (structured + free text), ESR.
- Blood group and Hb genotype (categorical results).

### Medical Microbiology
- Staged results over days: specimen → microscopy/Gram stain → culture → organism ID → antibiotic sensitivity (S/I/R).
- Preliminary and final reports; final release locks the report.
- Configurable organism and antibiotic lists per lab.

## Platform features in v1
| Area | Included |
| --- | --- |
| Platform super-admin | Create lab (tenant), set subdomain and branding, create its first Manager |
| Manager | Staff and roles, test catalogue, reference ranges, organisms/antibiotics, branding |
| Front desk | Patient registration, requests, payment confirmation (paid / pay later), barcode labels |
| Sample tracking | Full state machine, rejection with reasons |
| Results | Entry per section, flagging, calculated values |
| Verification | Chief Scientist verifies and releases; versioned amendments; microbiology preliminary reports |
| Delivery | Branded PDF slip, secure expiring patient link via WhatsApp |
| Automation | Critical value escalation (WhatsApp → SMS → Chief Scientist → Manager), TAT warnings, daily n8n report |
| Compliance | Full audit log, tenant isolation (API scoping + Postgres RLS) |

## Not in v1
- Self-service lab sign-up and billing
- Custom domains per lab (subdomains only)
- QC module with Westgard rules, delta checks, TAT dashboard
- Analyzer integration (HL7/ASTM)
- Doctor portal with logins
- Invoicing, receipts and online payments (v1 only records that payment was confirmed)
- Mobile app
