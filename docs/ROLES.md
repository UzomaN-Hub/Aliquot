# Aliquot — Roles & Permissions

**Status:** Agreed · 1 Nov 2026

## Scope terms
- **Lab (tenant):** every user except the super-admin belongs to one lab and only sees that lab's data.
- **Sections:** Chemical Pathology, Haematology, Medical Microbiology. Lab Scientists and Chief Scientists only work in the sections assigned to them (one, several or all).
- A user can hold more than one role (common in small labs).

## Roles
| Role | Scope | Responsibilities |
| --- | --- | --- |
| Super-admin | Platform only (Uzoma) | Create, suspend, reactivate or remove labs; set subdomain and initial branding; create each lab's first Manager. **No access to any lab's patients, samples or results.** Sees only tenant-level info (name, status, staff count, usage numbers) |
| Manager | One lab | Staff accounts and roles, section assignment, test catalogue and prices, reference ranges, organisms/antibiotics, branding, lab settings, reports |
| Chief Scientist | Assigned sections | Verify and release results, amend released results, acknowledge critical alerts, oversee the section's worklist |
| Lab Scientist | Assigned sections | Receive or reject samples, enter results |
| Front Desk | One lab | Register patients, create requests, print labels, mark samples collected |

Doctors have no login in v1. They receive critical alerts and result links via WhatsApp/SMS.

## Permission matrix
| Action | Manager | Chief Scientist | Lab Scientist | Front Desk |
| --- | --- | --- | --- | --- |
| Register patient, create request | No | No | No | Yes |
| Print labels, mark collected | No | No | No | Yes |
| Receive / reject sample | No | Yes | Yes | No |
| Enter results | No | Yes | Yes | No |
| Verify and release | No | Yes (including own entries) | No | No |
| Amend released result | No | Yes, with reason | No | No |
| Acknowledge critical alert | Yes | Yes | No | No |
| View results | All | Assigned sections | Assigned sections | Status only |
| Manage staff, catalogue, ranges, branding | Yes | No | No | No |
| View audit log | Yes | Assigned sections | No | No |
| Daily report | Yes | Yes | No | No |

## Rules
- Chief Scientists may verify any result in their sections, including their own entries; their name is recorded as the accountable verifier.
- Lab Scientists can never verify.
- Super-admin is a landlord, not an occupant: platform endpoints only touch tenant records, and RLS gives the super-admin role no access to clinical tables.
- Every permission is enforced in the API (route dependency) and covered by a test.
- Critical alert escalation: requesting doctor → Chief Scientist(s) of that section → Manager.
