# Aliquot — User Flows

**Status:** Agreed · 18 Nov 2026

## 1. Platform: onboard a lab (Super-admin)
1. Create lab: name, subdomain, logo, address, phone.
2. Create the lab's first Manager (email). Aliquot emails an invite link (expires in 72 h).
3. Lab status: Active. Suspend → staff can't sign in, patient links show "Unavailable"; data is kept. Reactivate restores everything.

## 2. Lab setup (Manager, first sign-in)
1. Set password from invite.
2. Branding check: logo, name and result-slip signatories preview.
3. Sections on: Chemical Pathology, Haematology, Microbiology (any combination).
4. Test catalogue: starts from Aliquot's default catalogue; Manager edits prices, ranges, critical limits, turnaround times.
5. Add staff: name, email, roles, sections → invite emails.

## 3. Patient visit (Front Desk)
1. Search patient by name, phone or hospital no. → found, or Register (duplicate warning on same name + DOB or phone).
2. New request: requesting doctor (pick or add with phone), clinical details, tests/panels, priority (Routine/STAT).
3. Payment confirmation: Front Desk ticks "Paid" (amount auto-filled from catalogue prices, method: cash, transfer, POS) before labels can print. No invoices or online payment in v1. Manager can allow "Pay later" per request for corporate or HMO patients.
4. System generates lab no. and one barcode label per container; shows which containers to collect.
5. Collect sample → mark collected (time and collector recorded).
6. Sample goes to the lab.

## 4. Bench (Lab Scientist / Chief Scientist)
1. **Reception:** scan barcode → Receive, or Reject with reason (haemolysed, clotted, insufficient, wrong container, unlabelled). Rejection notifies Front Desk to recollect; recollection is a new sample on the same request.
2. **Worklist:** section's received samples, STAT first, then due time.
3. **Result entry:**
   - Chem path and haematology: grid entry, live flags, calculated values filled automatically.
   - Microbiology: staged over days (microscopy → culture → organism ID → sensitivity). The Chief Scientist can release a **preliminary report** (e.g. Gram stain, "Culture in progress, final in 48 h") to the doctor; the patient link shows it marked "Preliminary". The final report replaces it and locks the result.
4. Critical value entered → inline warning; on save, escalation starts (flow 6).
5. Save → sample moves to the verification queue.

## 5. Verify and release (Chief Scientist)
1. Verification queue for their sections, STAT first.
2. Open sample: results, flags, previous results for the patient, entry notes.
3. Verify and release (may include own entries), or send back to bench with a comment.
4. On release: PDF generated; patient gets WhatsApp link; doctor gets WhatsApp summary + link.
5. Amend after release: reason required, new version created, patient and doctor notified "Amended result".

## 6. Critical value escalation (automatic)
1. Critical result saved → WhatsApp to requesting doctor with an acknowledge link. SMS if WhatsApp fails.
2. Not acknowledged in 15 min → Chief Scientist(s) of that section alerted; in-app banner for them.
3. Still not acknowledged in another 15 min → Manager alerted.
4. Any recipient acknowledges → escalation stops; who and when is logged.
5. Timings are a lab setting.

## 7. Patient gets results (public)
1. Opens WhatsApp link → enters last 4 digits of their phone number.
2. Sees result in the lab's branding → downloads PDF.
3. Link expires after 7 days (lab setting); patient can request a fresh link from the lab.
4. Wrong digits 5 times → link locked for 30 min.

## 8. Doctor acknowledges a critical (public)
1. Opens link from WhatsApp → sees patient, test, value, flag.
2. Taps "Acknowledge" → confirmation; escalation stops.
3. No login, no other patient data visible.

## 9. Daily report (automatic, n8n)
07:00 each day → Manager and Chief Scientists receive yesterday's numbers: received, released, rejected (reasons), criticals and acknowledgement times, turnaround breaches.

## 10. Account flows (all staff)
Sign in · forgot password (email link, 1 h) · set password from invite · change password · sign out. Session expires after 8 h of inactivity; unsaved entries are kept through re-sign-in.
