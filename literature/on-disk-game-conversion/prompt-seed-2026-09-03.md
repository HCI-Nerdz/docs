# Prompt seed — on-disk game conversion / hash-matched profiles

**Date:** 2026-09-03  
**Channel:** Cursor session (Linux gaming strategy dump → encyclopedia)  
**Curated faces:** HCI *On-disk game conversion*; DevCentr *Hash-matched binary conversion profiles*

## Intent (paraphrased)

People keep live-transcoding Windows game binaries into Linux calls (Wine / Proton-class runtimes). Alternative thesis:

1. Prefer **convert-on-disk** to Linux-native (or host-native) computing, then **cache** the converted tree.
2. Ideal: vendor stores ship or host the cached conversion (or a signed profile).
3. Legal-minded fallback: user converts **their own** installed copies; hubs run converted trees instead of originals.
4. Do **not** distribute hacked game binaries. Distribute a **conversion recipe / profile** matched by content hash.
5. Store / hub **vendor source priority**: native Linux → legally shippable ported binary → original + conversion profile.
6. Installer recognition wraps install (or post-install) with conversion of candidate files; porting the Windows installer itself is harder and optional.

Moral intuition stated by author: if you may shred or decorate a binary you lawfully hold, local conversion should be in the same family — with the usual DRM / EULA / anti-circumvention caveats called out in the curated pages (not as cheerleading).

## Do not treat this file as policy

Prefer the curated AsciiDoc pages. This seed is provenance for wording and unused side-paths.
Related technical substrate (DevCentr): `equivalence-engine` (rules / DAG mappings), `binary-tailor` (post-delivery on-disk reshape instinct — different job, same *disk-after-download* family).
